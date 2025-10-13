import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Fetches film content from Internet Archive
 * Collections used:
 * - opensource_movies: Open source films
 * - feature_films: Classic feature films
 * - shortfilms: Short films
 */

// Curated list of quality films from Internet Archive
// Mix of classic public domain (pre-1970) and modern indie/open source (2000+)
// Organized by genre with good distribution for infinite scroll experience
const CURATED_FILMS = [
  // ========== COMEDY (Classic + Modern) ==========
  { id: 'charlie_chaplin_film_fest', genre: 'Comedy', era: 'classic' },
  { id: 'his_girl_friday', genre: 'Comedy', era: 'classic' },
  { id: '3stooges', genre: 'Comedy', era: 'classic' },
  { id: 'utopia', genre: 'Comedy', era: 'classic' },
  { id: 'Mclintock.avi', genre: 'Comedy', era: 'classic' }, // 1963 John Wayne comedy western
  { id: 'my_favorite_brunette', genre: 'Comedy', era: 'classic' }, // 1947 Bob Hope
  { id: 'DeadManDrinking', genre: 'Comedy', era: 'modern' }, // 2008 indie comedy (88 min)
  { id: 'texmontana', genre: 'Comedy', era: 'modern' }, // 2016 indie comedy (83 min)

  // ========== HORROR (Classic + Indie) ==========
  { id: 'house_on_haunted_hill_ipod', genre: 'Horror', era: 'classic' },
  { id: 'carnival_of_souls', genre: 'Horror', era: 'classic' },
  { id: 'BloodyPitOfHorror', genre: 'Horror', era: 'classic' }, // 1965 Italian gothic horror
  { id: 'white_zombie', genre: 'Horror', era: 'classic' }, // 1932 Bela Lugosi zombie classic
  { id: 'InvasionOfTheBeeGirls', genre: 'Horror', era: 'classic' }, // 1973 sci-fi horror
  { id: 'Horror_Express', genre: 'Horror', era: 'classic' }, // 1973 Christopher Lee & Peter Cushing
  { id: 'Night.Of.The.Living.Dead_1080p', genre: 'Horror', era: 'classic' }, // 1968 Romero zombie classic
  { id: 'Decay2012-TheLhcZombieFilmfullFilm', genre: 'Horror', era: 'modern' }, // 2012 indie zombie film at CERN
  { id: 'marble-hornets-complete-series', genre: 'Horror', era: 'modern' }, // 2009 found footage web series
  { id: 'hunters-2016', genre: 'Horror', era: 'modern' }, // 2016 indie horror (96 min)
  { id: 's-man-2006-dvd-rip-vose-desmiembros.blogspot.com', genre: 'Horror', era: 'modern' }, // 2006 documentary horror (84 min)
  { id: 'nightwing.-1979.1080p.-blu-ray.-h-264.-aac-rarbg', genre: 'Horror', era: 'modern' }, // 1979 creature horror (105 min)

  // ========== SCI-FI (Classic + Modern Open Source) ==========
  { id: 'VoyagetothePlanetofPrehistoricWomen', genre: 'Sci-Fi', era: 'classic' },
  { id: 'ElephantsDream', genre: 'Sci-Fi', era: 'modern' }, // 2006 Blender open movie
  { id: 'Sintel', genre: 'Sci-Fi', era: 'modern' }, // 2010 Blender open movie (fantasy/action)
  { id: 'Killers_from_space', genre: 'Sci-Fi', era: 'classic' }, // 1954 alien invasion
  { id: 'StarOdysseyitalianStarWars1979', genre: 'Sci-Fi', era: 'classic' }, // 1979 Italian Star Wars ripoff
  { id: 'The_Wasp_Women', genre: 'Sci-Fi', era: 'classic' }, // 1960 Roger Corman

  // ========== ACTION / ADVENTURE (Classic + Modern) ==========
  { id: 'TheFastandtheFuriousJohnIreland1954goofyrip', genre: 'Action', era: 'classic' },
  { id: 'Return_of_the_Kung_Fu_Dragon', genre: 'Action', era: 'classic' },
  { id: 'JungleBook', genre: 'Adventure', era: 'classic' },
  { id: 'tarzans_revenge', genre: 'Adventure', era: 'classic' }, // 1938 Tarzan film
  { id: 'lost_world', genre: 'Adventure', era: 'classic' }, // 1925 dinosaur adventure
  { id: 'tarzan_and_the_green_goddess', genre: 'Adventure', era: 'classic' }, // 1938 Tarzan film
  { id: 'Snowblind-film__2010', genre: 'Action', era: 'modern' }, // 2010 indie action (92 min)
  { id: 'code-name-jenny', genre: 'Action', era: 'modern' }, // 2018 German action thriller (108 min)

  // ========== DRAMA (Classic + Modern Indie) ==========
  { id: 'the_great_dictator', genre: 'Drama', era: 'classic' },
  { id: 'detour_1945', genre: 'Drama', era: 'classic' },
  { id: 'DOA1950', genre: 'Drama', era: 'classic' },
  { id: 'abraham_lincoln', genre: 'Drama', era: 'classic' },
  { id: 'suddenly', genre: 'Drama', era: 'classic' },
  { id: 'reefer_madness1938', genre: 'Drama', era: 'classic' },
  { id: 'vals-im-bashir-2008', genre: 'Drama', era: 'modern' }, // 2008 animated war documentary (90 min)
  { id: 'animal-kingdom-david-michod-2010-spa', genre: 'Drama', era: 'modern' }, // 2010 Australian crime drama (108 min)

  // ========== ANIMATION (Classic + Modern Open Source) ==========
  { id: 'Sita_Sings_the_Blues', genre: 'Animation', era: 'modern' }, // 2008 indie animation
  { id: 'ThisLandIsMine', genre: 'Animation', era: 'modern' }, // 2012 animated short
  { id: 'open-season_202209', genre: 'Animation', era: 'modern' }, // 2007 Open Season (86 min)
  { id: 'thief-cobbler-91713-hd-h-264', genre: 'Animation', era: 'modern' }, // 2013 The Thief and the Cobbler Recobbled (99 min)
  { id: 'midoridvd', genre: 'Animation', era: 'modern' }, // 2006 Midori (48 min)

  // ========== FAMILY (Classic + Modern) ==========
  { id: 'The_Pied_Piper_of_Hamelin', genre: 'Family', era: 'classic' },

  // ========== MYSTERY / THRILLER (Classic) ==========
  { id: 'dressed_to_kill', genre: 'Mystery', era: 'classic' },

  // ========== DOCUMENTARY (Modern) ==========
  { id: 'youtube-oULO3i5Xra0', genre: 'Documentary', era: 'modern' }, // 2013 DPRK: The Land Of Whispers (58 min)
  { id: '20100726-united-we-fall', genre: 'Documentary', era: 'modern' }, // 2010 United We Fall (123 min)
];

/**
 * Fetch metadata for a single Internet Archive item
 */
async function fetchItemMetadata(identifier) {
  const url = `https://archive.org/metadata/${identifier}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata for ${identifier}`);
  }

  return response.json();
}

/**
 * Extract best video file from Internet Archive metadata
 * Prioritizes: 512Kb MP4 (good for trailers), then regular MP4
 */
function getBestVideoFile(metadata) {
  if (!metadata.files || !Array.isArray(metadata.files)) {
    return null;
  }

  // Look for MP4 files
  const mp4Files = metadata.files.filter(file =>
    file.format === 'h.264' ||
    file.format === 'h.264 IA' ||
    file.format === 'MPEG4' ||
    (file.name && file.name.endsWith('.mp4'))
  );

  if (mp4Files.length === 0) {
    return null;
  }

  // Prefer 512Kb version (good quality, smaller size)
  const preferred = mp4Files.find(f => f.name && f.name.includes('512kb'));
  if (preferred) {
    return preferred;
  }

  // Otherwise, get the smallest MP4 for faster loading
  const sorted = mp4Files.sort((a, b) => {
    const sizeA = parseInt(a.size || '999999999');
    const sizeB = parseInt(b.size || '999999999');
    return sizeA - sizeB;
  });

  return sorted[0];
}

/**
 * Build video URL from Internet Archive metadata
 */
function buildVideoUrl(identifier, filename) {
  return `https://archive.org/download/${identifier}/${encodeURIComponent(filename)}`;
}

/**
 * Build thumbnail URL
 */
function buildThumbnailUrl(identifier) {
  return `https://archive.org/services/img/${identifier}`;
}

/**
 * Process all curated films
 */
async function fetchAllContent() {
  console.log('🎬 Fetching content from Internet Archive...\n');

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const film of CURATED_FILMS) {
    try {
      console.log(`Fetching: ${film.id}...`);

      const metadata = await fetchItemMetadata(film.id);

      // Check if item is dark/unavailable
      if (metadata.is_dark) {
        console.log(`  ✗ Skipped: ${film.id} - Item is private/unavailable\n`);
        failCount++;
        continue;
      }

      const videoFile = getBestVideoFile(metadata);

      if (!videoFile) {
        console.log(`  ✗ Skipped: ${film.id} - No suitable video file found\n`);
        failCount++;
        continue;
      }

      const title = metadata.metadata?.title || film.id.replace(/_/g, ' ');
      const description = metadata.metadata?.description || 'Classic film from Internet Archive';
      const year = metadata.metadata?.year || metadata.metadata?.date || 'Unknown';
      const runtime = parseFloat(videoFile.length || '0');

      const videoUrl = buildVideoUrl(film.id, videoFile.name);
      const thumbnailUrl = buildThumbnailUrl(film.id);

      const result = {
        id: film.id,
        title: title,
        genre: film.genre,
        synopsis: description.substring(0, 300), // Truncate long descriptions
        year: year,

        // Video URLs (direct MP4 files)
        trailerType: 'direct',
        trailerVideoId: videoUrl, // Full URL for direct playback
        trailerDurationSeconds: Math.floor(runtime),

        // For now, trailer and full content are the same
        fullContentType: 'direct',
        fullContentVideoId: videoUrl,
        fullContentDurationSeconds: Math.floor(runtime),

        thumbnailUrl: thumbnailUrl,

        // Engagement metrics
        likes: 0,
        shares: 0,
        reviews: 0,
        averageRating: 0,

        // Internet Archive specific
        archiveId: film.id,
        fileSize: parseInt(videoFile.size || '0'),
        resolution: `${videoFile.width}x${videoFile.height}`
      };

      results.push(result);
      successCount++;

      console.log(`  ✓ Added: ${title}`);
      console.log(`    Video: ${videoFile.name}`);
      console.log(`    Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`    Duration: ${Math.floor(runtime / 60)}m ${Math.floor(runtime % 60)}s\n`);

      // Rate limit: be nice to Internet Archive
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`  ✗ Error: ${film.id} - ${error.message}\n`);
      failCount++;
    }
  }

  // Save results
  const outputPath = join(__dirname, '../shared/mocks/archive-content.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Fetch complete!`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Saved to: shared/mocks/archive-content.json\n`);

  return results;
}

// Run the script
fetchAllContent().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
