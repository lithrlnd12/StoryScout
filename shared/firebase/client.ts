import { initializeApp, type FirebaseApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import { firebaseConfig } from './config';

let appInstance: FirebaseApp | null = null;
let analyticsInstance: Analytics | null = null;
let analyticsModulePromise: Promise<typeof import('firebase/analytics')> | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) {
    return analyticsInstance;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  if (!analyticsModulePromise) {
    analyticsModulePromise = import('firebase/analytics');
  }
  const { getAnalytics, isSupported } = await analyticsModulePromise;
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }
  analyticsInstance = getAnalytics(getFirebaseApp());
  return analyticsInstance;
}
