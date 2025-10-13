import type { FirebaseOptions } from 'firebase/app';

// Direct access to Vite env vars (works in browser)
// Falls back to hardcoded values for development
// Uses indirect access to avoid Hermes parse errors in React Native
function getViteEnv(key: string): string | undefined {
  // Indirect access prevents Hermes from seeing "import.meta" during parse
  const globalRef = typeof globalThis !== 'undefined' ? globalThis : undefined;
  const importMeta = globalRef && (globalRef as any)['import'] && (globalRef as any)['import']['meta'];

  if (importMeta && importMeta.env) {
    return importMeta.env[key];
  }
  return undefined;
}

// Fallback to hardcoded values from .env file
export const firebaseConfig: FirebaseOptions = {
  apiKey: getViteEnv('VITE_FIREBASE_API_KEY') || 'AIzaSyCA-z_hEagm4oP5dFeHv2Ut4yF1YH1zNbI',
  authDomain: getViteEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'story-scout.firebaseapp.com',
  projectId: getViteEnv('VITE_FIREBASE_PROJECT_ID') || 'story-scout',
  storageBucket: getViteEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'story-scout.firebasestorage.app',
  messagingSenderId: getViteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '148426129717',
  appId: getViteEnv('VITE_FIREBASE_APP_ID') || '1:148426129717:web:462a557ff1908c44ea0c7c',
  measurementId: getViteEnv('VITE_FIREBASE_MEASUREMENT_ID') || 'G-R4F9NS108F'
};

console.log('🔥 Firebase config:', {
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
  projectId: firebaseConfig.projectId
});
