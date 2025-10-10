#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const DEFAULT_BUCKET = 'story-scout.firebasestorage.app';
const credentialPath = process.env.FIREBASE_ADMIN_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(__dirname, '../local/serviceAccountKey.json');

if (!fs.existsSync(credentialPath)) {
  console.error('
[seed] Service account file not found at ' + credentialPath + '.');
  console.error('Set FIREBASE_ADMIN_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS to your JSON key.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: DEFAULT_BUCKET
});

const db = admin.firestore();
const dataPath = path.resolve(__dirname, '../shared/mocks/trailers.json');

if (!fs.existsSync(dataPath)) {
  console.error('[seed] Mock data missing at ' + dataPath);
  process.exit(1);
}

const trailers = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

async function seed() {
  if (!Array.isArray(trailers) || trailers.length === 0) {
    console.warn('[seed] No trailer data found in shared/mocks/trailers.json');
    return;
  }

  const batch = db.batch();
  const now = Date.now();

  trailers.forEach((item, index) => {
    const id = item.id || ('trailer_' + String(index + 1).padStart(3, '0'));
    const docRef = db.collection('publicContent').doc(id);
    const createdAt = admin.firestore.Timestamp.fromDate(new Date(now - index * 60000));

    batch.set(docRef, {
      title: item.title || 'Untitled',
      genre: item.genre || 'Unknown',
      synopsis: item.synopsis || '',
      trailerUrl: item.trailerUrl || '',
      fullContentUrl: item.fullContentUrl || '',
      thumbnailUrl: item.thumbnailUrl || '',
      durationSeconds: item.durationSeconds || 0,
      likes: item.likes || 0,
      creatorId: item.creatorId || item.creator || null,
      creatorName: item.creator || item.creatorName || null,
      createdAt
    }, { merge: true });
  });

  await batch.commit();
  console.log('[seed] Seeded ' + trailers.length + ' document(s) into publicContent.');
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[seed] Failed to seed public content: ' + err.message);
    process.exit(1);
  });
