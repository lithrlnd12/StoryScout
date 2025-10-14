// Re-export from shared Firebase auth
export {
  subscribeToAuthChanges,
  signInWithEmail,
  signUpWithEmail,
  signOutFirebase,
  getCurrentUser,
  type User,
  type UserCredential
} from '../../shared/firebase/auth';
