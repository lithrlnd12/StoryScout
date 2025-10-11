import { getEnvValue } from '../utils/env';

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
  const params: string[] = ['title=0', 'byline=0', 'portrait=0'];
  if (options?.autoplay) params.push('autoplay=1');
  if (options?.muted) params.push('muted=1');
  const query = params.length ? '?' + params.join('&') : '';
  return 'https://player.vimeo.com/video/' + vimeoId + query;
}

export function getVimeoClientId(): string | undefined {
  return getEnvValue('VIMEO_CLIENT_ID');
}
