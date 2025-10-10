export type VimeoCategory = string;

const CATEGORY_MAP: Record<VimeoCategory, string> = {
  animation: 'Animation',
  art: 'Art',
  comedy: 'Comedy',
  documentary: 'Documentary',
  drama: 'Drama',
  educational: 'Educational',
  experimental: 'Fantasy',
  fashion: 'Lifestyle',
  food: 'Lifestyle',
  kids: 'Family',
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
  horror: 'Horror'
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
  const params = new URLSearchParams();
  if (options?.autoplay) params.set('autoplay', '1');
  if (options?.muted) params.set('muted', '1');
  params.set('title', '0');
  params.set('byline', '0');
  params.set('portrait', '0');
  const query = params.toString();
  return 'https://player.vimeo.com/video/' + vimeoId + (query ? '?' + query : '');
}

export function getVimeoClientId(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.VIMEO_CLIENT_ID) {
    return process.env.VIMEO_CLIENT_ID;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VIMEO_CLIENT_ID) {
    return (import.meta as any).env.VIMEO_CLIENT_ID;
  }
  if (typeof global !== 'undefined' && (global as any).VIMEO_CLIENT_ID) {
    return (global as any).VIMEO_CLIENT_ID;
  }
  return undefined;
}
