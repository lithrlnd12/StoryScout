import type { FirebaseOptions } from 'firebase/app';

const env = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : undefined;
const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;

function readEnv(key: string): string | undefined {
  if (env && typeof env[key] === 'string') {
    return env[key] as string;
  }
  if (nodeEnv && typeof nodeEnv[key] === 'string') {
    return nodeEnv[key];
  }
  return undefined;
}

function requireEnv(keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  keys.forEach(key => {
    const value = readEnv(key);
    if (value) {
      values[key] = value;
    }
  });
  return values;
}

const values = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY') || readEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN') || readEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID') || readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET') || readEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || readEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID') || readEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID') || readEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID')
};

export const firebaseConfig: FirebaseOptions = values;
