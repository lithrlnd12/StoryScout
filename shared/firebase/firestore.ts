import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  setDoc,
  deleteDoc,
  increment,
  updateDoc,
  getDocs,
  type FirestoreDataConverter,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseApp } from './client';
import { buildVimeoEmbedUrl, mapVimeoCategoriesToGenre } from '../services/vimeo';

export type VideoSource = 'vimeo' | 'youtube' | 'archive' | 'external';

export type TrailerDoc = {
  id: string;
  title: string;
  genre: string;
  synopsis: string;

  // Trailer (shown in feed)
  trailerType: VideoSource;
  trailerVideoId?: string;  // Vimeo/YouTube/Archive ID
  trailerUrl?: string;      // Full embed URL
  trailerDurationSeconds?: number;

  // Full content (shown on "Watch Now")
  fullContentType: VideoSource;
  fullContentVideoId?: string;  // Vimeo/YouTube/Archive ID
  fullContentUrl?: string;      // Full embed URL or external link
  fullContentDurationSeconds?: number;

  thumbnailUrl: string;
  likes?: number;
  shares?: number;
  reviews?: number;
  averageRating?: number;
  createdAt?: Timestamp;

  // Legacy fields for backward compatibility
  vimeoId?: string;
  vimeoCategories?: string[];
  durationSeconds?: number;
};

export type EngagementType = 'like' | 'share' | 'review';

export type Engagement = {
  id: string;
  userId: string;
  contentId: string;
  type: EngagementType;
  createdAt: Timestamp;
};

export type Review = {
  id: string;
  userId: string;
  contentId: string;
  rating: number;
  reviewText: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

const converter: FirestoreDataConverter<TrailerDoc> = {
  toFirestore(value) {
    return value;
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();

    // Legacy support
    const vimeoCategories: string[] = data.vimeoCategories ?? [];
    const vimeoId: string | undefined = data.vimeoId ?? undefined;
    const derivedGenre = vimeoCategories.length ? mapVimeoCategoriesToGenre(vimeoCategories) : 'Unknown';

    // New model with defaults from legacy fields
    const trailerType: VideoSource = data.trailerType ?? (vimeoId ? 'vimeo' : 'vimeo');
    const trailerVideoId = data.trailerVideoId ?? vimeoId;
    const trailerUrl = data.trailerUrl ?? (trailerVideoId && trailerType === 'vimeo'
      ? buildVimeoEmbedUrl(trailerVideoId, { autoplay: true, muted: true, loop: true })
      : '');

    const fullContentType: VideoSource = data.fullContentType ?? 'vimeo';
    const fullContentVideoId = data.fullContentVideoId ?? vimeoId;
    const fullContentUrl = data.fullContentUrl ?? (fullContentVideoId && fullContentType === 'vimeo'
      ? buildVimeoEmbedUrl(fullContentVideoId)
      : '');

    return {
      id: snapshot.id,
      title: data.title ?? '',
      genre: data.genre ?? derivedGenre,
      synopsis: data.synopsis ?? '',

      trailerType,
      trailerVideoId,
      trailerUrl,
      trailerDurationSeconds: data.trailerDurationSeconds,

      fullContentType,
      fullContentVideoId,
      fullContentUrl,
      fullContentDurationSeconds: data.fullContentDurationSeconds,

      thumbnailUrl: data.thumbnailUrl ?? '',
      likes: data.likes ?? 0,
      shares: data.shares ?? 0,
      reviews: data.reviews ?? 0,
      averageRating: data.averageRating ?? 0,
      createdAt: data.createdAt,

      // Legacy
      vimeoId,
      vimeoCategories,
      durationSeconds: data.durationSeconds
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

// Engagement functions
export async function toggleLike(userId: string, contentId: string): Promise<boolean> {
  const db = getFirestore(getFirebaseApp());
  const engagementId = `${userId}_${contentId}_like`;
  const engagementRef = doc(db, 'engagements', engagementId);
  const contentRef = doc(db, 'publicContent', contentId);

  // Check if engagement exists
  const engagementsQuery = query(
    collection(db, 'engagements'),
    where('userId', '==', userId),
    where('contentId', '==', contentId),
    where('type', '==', 'like')
  );
  const snapshot = await getDocs(engagementsQuery);

  if (!snapshot.empty) {
    // Unlike - delete engagement and decrement count
    await deleteDoc(engagementRef);
    await updateDoc(contentRef, { likes: increment(-1) });
    return false;
  } else {
    // Like - create engagement and increment count
    await setDoc(engagementRef, {
      userId,
      contentId,
      type: 'like',
      createdAt: Timestamp.now()
    });
    await updateDoc(contentRef, { likes: increment(1) });
    return true;
  }
}

export async function shareContent(userId: string, contentId: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const engagementId = `${userId}_${contentId}_share_${Date.now()}`;
  const engagementRef = doc(db, 'engagements', engagementId);
  const contentRef = doc(db, 'publicContent', contentId);

  await setDoc(engagementRef, {
    userId,
    contentId,
    type: 'share',
    createdAt: Timestamp.now()
  });
  await updateDoc(contentRef, { shares: increment(1) });
}

export async function submitReview(
  userId: string,
  contentId: string,
  rating: number,
  reviewText: string
): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const reviewId = `${userId}_${contentId}`;
  const reviewRef = doc(db, 'reviews', reviewId);
  const contentRef = doc(db, 'publicContent', contentId);

  // Check if review already exists
  const reviewsQuery = query(
    collection(db, 'reviews'),
    where('userId', '==', userId),
    where('contentId', '==', contentId)
  );
  const snapshot = await getDocs(reviewsQuery);
  const isNewReview = snapshot.empty;

  await setDoc(reviewRef, {
    userId,
    contentId,
    rating,
    reviewText,
    createdAt: isNewReview ? Timestamp.now() : snapshot.docs[0].data().createdAt,
    updatedAt: Timestamp.now()
  });

  // Update review count if new
  if (isNewReview) {
    await updateDoc(contentRef, { reviews: increment(1) });
  }

  // Recalculate average rating
  const allReviewsQuery = query(
    collection(db, 'reviews'),
    where('contentId', '==', contentId)
  );
  const allReviews = await getDocs(allReviewsQuery);
  const ratings = allReviews.docs.map(doc => doc.data().rating);
  const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

  await updateDoc(contentRef, { averageRating });
}

export async function getUserEngagement(userId: string, contentId: string): Promise<{
  hasLiked: boolean;
}> {
  const db = getFirestore(getFirebaseApp());

  const likesQuery = query(
    collection(db, 'engagements'),
    where('userId', '==', userId),
    where('contentId', '==', contentId),
    where('type', '==', 'like')
  );
  const likesSnapshot = await getDocs(likesQuery);

  return {
    hasLiked: !likesSnapshot.empty
  };
}

export type ReviewCallback = (reviews: Review[]) => void;

export function subscribeToReviews(contentId: string, callback: ReviewCallback): () => void {
  const db = getFirestore(getFirebaseApp());
  const q = query(
    collection(db, 'reviews'),
    where('contentId', '==', contentId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, snapshot => {
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Review));
    callback(reviews);
  });

  return unsubscribe;
}
