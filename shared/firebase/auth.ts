import { getFirebaseApp } from './client';
export type { User, UserCredential } from 'firebase/auth';

let authInstance: import('firebase/auth').Auth | null = null;
let authModulePromise: Promise<typeof import('firebase/auth')> | null = null;

function isReactNative() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

async function loadAuthModule() {
  if (!authModulePromise) {
    authModulePromise = import('firebase/auth');
  }
  return authModulePromise;
}

async function getFirebaseAuthInstance(): Promise<import('firebase/auth').Auth> {
  if (authInstance) {
    return authInstance;
  }
  const app = getFirebaseApp();

  if (isReactNative()) {
    const [{ initializeAuth, getReactNativePersistence }, { default: AsyncStorage }] = await Promise.all([
      import('firebase/auth/react-native'),
      import('@react-native-async-storage/async-storage')
    ]);
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    const { getAuth } = await loadAuthModule();
    authInstance = getAuth(app);
  }

  return authInstance!;
}

export async function subscribeToAuthChanges(handler: (user: import('firebase/auth').User | null) => void) {
  const auth = await getFirebaseAuthInstance();
  const { onAuthStateChanged } = await loadAuthModule();
  return onAuthStateChanged(auth, handler);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = await getFirebaseAuthInstance();
  const { signInWithEmailAndPassword } = await loadAuthModule();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const auth = await getFirebaseAuthInstance();
  const { createUserWithEmailAndPassword } = await loadAuthModule();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutFirebase() {
  const auth = await getFirebaseAuthInstance();
  const { signOut } = await loadAuthModule();
  return signOut(auth);
}

export async function getCurrentUser() {
  const auth = await getFirebaseAuthInstance();
  return auth.currentUser;
}
