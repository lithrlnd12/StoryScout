import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(process.env.FIREBASE_ADMIN_CREDENTIALS || './service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Upload Internet Archive content to Firestore
 */
async function uploadArchiveContent() {
  console.log('📦 Loading Internet Archive content...\n');

  const archiveContent = JSON.parse(
    readFileSync(join(__dirname, '../shared/mocks/archive-content.json'), 'utf8')
  );

  console.log(`Found ${archiveContent.length} items to upload\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const item of archiveContent) {
    try {
      const docData = {
        title: item.title,
        genre: item.genre,
        synopsis: item.synopsis,
        year: item.year,

        // Trailer (for feed)
        trailerType: 'direct',
        trailerVideoId: item.trailerVideoId,
        trailerDurationSeconds: item.trailerDurationSeconds,

        // Full content
        fullContentType: 'direct',
        fullContentVideoId: item.fullContentVideoId,
        fullContentDurationSeconds: item.fullContentDurationSeconds,

        thumbnailUrl: item.thumbnailUrl,

        // Engagement metrics
        likes: 0,
        shares: 0,
        reviews: 0,
        averageRating: 0,

        // Metadata
        createdAt: admin.firestore.FieldValue.serverTimestamp(),

        // Internet Archive specific
        archiveId: item.archiveId || item.id
      };

      await db.collection('publicContent').doc(item.id).set(docData);
      console.log(`✓ Uploaded: ${item.title}`);
      successCount++;

    } catch (error) {
      console.error(`✗ Error uploading ${item.title}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${errorCount}\n`);
}

// Run the script
uploadArchiveContent()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
