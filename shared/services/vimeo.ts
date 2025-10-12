import { getEnvValue } from '../utils/env';

export type VimeoCategory = string;

const CATEGORY_MAP: Record<VimeoCategory, string> = {
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

const DEFAULT_GENRE = 'General';

export function mapVimeoCategoriesToGenre(categories?: VimeoCategory[] | null): string {
  if (!categories || categories.length === 0) {
    return DEFAULT_GENRE;
  }
  for (const category of categories) {
    const key = category.toLowerCase();
    if (CATEGORY_MAP[key]) {
      return CATEGORY_MAP[key];
    }
  }
  return DEFAULT_GENRE;
}

export function buildVimeoEmbedUrl(vimeoId: string, options?: { autoplay?: boolean; muted?: boolean }) {
  const params: string[] = ['title=0', 'byline=0', 'portrait=0'];
  if (options?.autoplay) params.push('autoplay=1');
  if (options?.muted) params.push('muted=1');
  const query = params.length ? '?' + params.join('&') : '';
  return 'https://player.vimeo.com/video/' + vimeoId + query;
}

export function getVimeoClientId(): string | undefined {
  return getEnvValue('VIMEO_CLIENT_ID');
}

export function getVimeoAccessToken(): string | undefined {
  return getEnvValue('VIMEO_ACCESS_TOKEN');
}

export interface VimeoVideo {
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

export interface VimeoSearchParams {
  query?: string;
  per_page?: number;
  page?: number;
  filter?: 'CC' | 'CC-BY' | 'CC-BY-SA' | 'CC0' | 'PDM';
  sort?: 'relevant' | 'date' | 'alphabetical' | 'duration' | 'likes' | 'plays';
}

export async function searchVimeoVideos(params: VimeoSearchParams): Promise<VimeoVideo[]> {
  const accessToken = getVimeoAccessToken();

  if (!accessToken) {
    throw new Error('VIMEO_ACCESS_TOKEN not configured');
  }

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

export function extractVimeoId(uri: string): string {
  // URI format: /videos/123456789
  const parts = uri.split('/');
  return parts[parts.length - 1];
}

export function getThumbnailUrl(video: VimeoVideo): string {
  if (!video.pictures?.sizes || video.pictures.sizes.length === 0) {
    return '';
  }
  // Get the 640x360 thumbnail or the largest available
  const sizes = video.pictures.sizes;
  const preferred = sizes.find(s => s.width === 640) || sizes[sizes.length - 1];
  return preferred.link;
}
