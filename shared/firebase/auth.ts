import { getFirebaseApp } from './client';
export type { User, UserCredential } from 'firebase/auth';

let authInstance: import('firebase/auth').Auth | null = null;

function isReactNative() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

async function loadReactNativeAuthModule() {
  const rnSpecifier = 'firebase/auth/' + 'react-native';
  try {
    return await import(rnSpecifier);
  } catch (error) {
    return await import('firebase/auth');
  }
}

async function getFirebaseAuthInstance(): Promise<import('firebase/auth').Auth> {
  if (authInstance) {
    return authInstance;
  }
  const app = getFirebaseApp();

  if (isReactNative()) {
    const [{ initializeAuth, getReactNativePersistence }, { default: AsyncStorage }] = await Promise.all([
      loadReactNativeAuthModule(),
      import('@react-native-async-storage/async-storage')
    ]);
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    const { getAuth } = await import('firebase/auth');
    authInstance = getAuth(app);
  }

  return authInstance!;
}

export async function subscribeToAuthChanges(handler: (user: import('firebase/auth').User | null) => void) {
  const auth = await getFirebaseAuthInstance();
  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(auth, handler);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = await getFirebaseAuthInstance();
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const auth = await getFirebaseAuthInstance();
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutFirebase() {
  const auth = await getFirebaseAuthInstance();
  const { signOut } = await import('firebase/auth');
  return signOut(auth);
}

export async function getCurrentUser() {
  const auth = await getFirebaseAuthInstance();
  return auth.currentUser;
}
