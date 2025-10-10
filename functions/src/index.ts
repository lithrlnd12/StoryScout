import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const ping = functions.https.onRequest(async (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});
