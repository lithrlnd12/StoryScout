import { getFirebaseApp } from './client';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type Auth,
  type User
} from 'firebase/auth';

export type { User, UserCredential } from 'firebase/auth';

let authInstance: Auth | null = null;

function getFirebaseAuthInstance(): Auth {
  if (authInstance) {
    return authInstance;
  }
  const app = getFirebaseApp();
  authInstance = getAuth(app);
  return authInstance!;
}

export function subscribeToAuthChanges(handler: (user: User | null) => void) {
  const auth = getFirebaseAuthInstance();
  return onAuthStateChanged(auth, handler);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = getFirebaseAuthInstance();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const auth = getFirebaseAuthInstance();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutFirebase() {
  const auth = getFirebaseAuthInstance();
  return signOut(auth);
}

export async function getCurrentUser() {
  const auth = getFirebaseAuthInstance();
  return auth.currentUser;
}
