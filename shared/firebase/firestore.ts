import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  type FirestoreDataConverter,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseApp } from './client';

export type TrailerDoc = {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  trailerUrl: string;
  fullContentUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  likes?: number;
  createdAt?: Timestamp;
};

const converter: FirestoreDataConverter<TrailerDoc> = {
  toFirestore(value) {
    return value;
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      title: data.title ?? '',
      genre: data.genre ?? 'Unknown',
      synopsis: data.synopsis ?? '',
      trailerUrl: data.trailerUrl ?? '',
      fullContentUrl: data.fullContentUrl ?? '',
      thumbnailUrl: data.thumbnailUrl ?? '',
      durationSeconds: data.durationSeconds ?? 0,
      likes: data.likes,
      createdAt: data.createdAt
    };
  }
};

export type PublicContentCallback = (items: TrailerDoc[]) => void;

export function subscribeToPublicContent(callback: PublicContentCallback, onError?: (error: Error) => void) {
  const db = getFirestore(getFirebaseApp());
  const q = query(collection(db, 'publicContent').withConverter(converter), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(doc => doc.data());
      callback(items);
    },
    error => {
      if (onError) {
        onError(error);
      }
    }
  );
  return unsubscribe;
}
