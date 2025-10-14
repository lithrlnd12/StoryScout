import { initializeApp, type FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
}

// Analytics is not available in React Native
export async function getFirebaseAnalytics(): Promise<null> {
  return null;
}
