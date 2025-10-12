import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const ping = functions.https.onRequest(async (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

interface VimeoVideo {
  uri: string;
  name: string;
  description: string | null;
  duration: number;
  categories?: Array<{ name: string }>;
  pictures?: {
    sizes: Array<{ link: string; width: number; height: number }>;
  };
  link: string;
}

const CATEGORY_MAP: Record<string, string> = {
  animation: 'Animation',
  art: 'Art',
  comedy: 'Comedy',
  documentary: 'Documentary',
  drama: 'Drama',
  educational: 'Educational',
  education: 'Educational',
  experimental: 'Fantasy',
  fantasy: 'Fantasy',
  fashion: 'Lifestyle',
  food: 'Lifestyle',
  kids: 'Family',
  family: 'Family',
  music: 'Music',
  news: 'Documentary',
  people: 'Drama',
  sports: 'Sports',
  tech: 'Technology',
  technology: 'Technology',
  travel: 'Travel',
  tutorial: 'Educational',
  shortfilms: 'Short Film',
  scifi: 'Sci-Fi',
  thriller: 'Thriller',
  horror: 'Horror',
  action: 'Action',
  romance: 'Romance',
  inspiration: 'Inspirational',
  environment: 'Documentary',
  nature: 'Nature',
  science: 'Science'
};

function mapVimeoCategoriesToGenre(categories?: Array<{ name: string }>): string {
  if (!categories || categories.length === 0) {
    return 'General';
  }
  for (const category of categories) {
    const key = category.name.toLowerCase();
    if (CATEGORY_MAP[key]) {
      return CATEGORY_MAP[key];
    }
  }
  return 'General';
}

function extractVimeoId(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1];
}

function buildVimeoEmbedUrl(vimeoId: string, options?: { autoplay?: boolean; muted?: boolean }) {
  const params: string[] = ['title=0', 'byline=0', 'portrait=0'];
  if (options?.autoplay) params.push('autoplay=1');
  if (options?.muted) params.push('muted=1');
  const query = params.length ? '?' + params.join('&') : '';
  return 'https://player.vimeo.com/video/' + vimeoId + query;
}

function getThumbnailUrl(video: VimeoVideo): string {
  if (!video.pictures?.sizes || video.pictures.sizes.length === 0) {
    return '';
  }
  const sizes = video.pictures.sizes;
  const preferred = sizes.find(s => s.width === 640) || sizes[sizes.length - 1];
  return preferred.link;
}

async function getStaffPickVideos(
  accessToken: string,
  perPage: number = 10
): Promise<VimeoVideo[]> {
  const url = `https://api.vimeo.com/channels/staffpicks/videos?per_page=${perPage}&sort=likes`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.vimeo.*+json;version=3.4'
    }
  });

  if (!response.ok) {
    throw new Error(`Vimeo API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function searchVimeoVideos(
  accessToken: string,
  params: {
    query?: string;
    per_page?: number;
    page?: number;
    filter?: string;
    sort?: string;
  }
): Promise<VimeoVideo[]> {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set('query', params.query);
  if (params.per_page) searchParams.set('per_page', params.per_page.toString());
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.filter) searchParams.set('filter', params.filter);
  if (params.sort) searchParams.set('sort', params.sort);

  const url = `https://api.vimeo.com/videos?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.vimeo.*+json;version=3.4'
    }
  });

  if (!response.ok) {
    throw new Error(`Vimeo API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export const syncVimeoContent = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onRequest(async (req, res) => {
  try {
    const accessToken = functions.config().vimeo?.access_token || process.env.VIMEO_ACCESS_TOKEN;

    if (!accessToken) {
      res.status(500).json({ error: 'VIMEO_ACCESS_TOKEN not configured' });
      return;
    }

    const db = admin.firestore();
    const batch = db.batch();
    let totalAdded = 0;

    functions.logger.info('Fetching Staff Picks from Vimeo...');

    // Get Staff Picks - these are guaranteed to be embeddable
    const videos = await getStaffPickVideos(accessToken, 50);

    for (const video of videos) {
      const vimeoId = extractVimeoId(video.uri);
      const vimeoCategories = video.categories?.map(c => c.name.toLowerCase()) || [];
      const genre = mapVimeoCategoriesToGenre(video.categories) || 'General';

      const docId = `vimeo_${vimeoId}`;
      const docRef = db.collection('publicContent').doc(docId);

      batch.set(docRef, {
        title: video.name || 'Untitled',
        genre,
        synopsis: video.description || 'A curated video from Vimeo Staff Picks.',
        trailerUrl: buildVimeoEmbedUrl(vimeoId, { autoplay: true, muted: true }),
        fullContentUrl: buildVimeoEmbedUrl(vimeoId),
        thumbnailUrl: getThumbnailUrl(video),
        durationSeconds: video.duration || 0,
        likes: 0,
        vimeoId,
        vimeoCategories,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      totalAdded++;
    }

    await batch.commit();

    res.status(200).json({
      success: true,
      message: `Successfully synced ${totalAdded} videos from Vimeo`
    });
  } catch (error) {
    functions.logger.error('Error syncing Vimeo content:', error);
    res.status(500).json({
      error: 'Failed to sync Vimeo content',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
