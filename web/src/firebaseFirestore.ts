// Web-specific Firestore that uses the web Firebase client
import { getFirebaseApp } from './firebaseClient';
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  increment,
  updateDoc,
  getDocs,
  limit,
  type FirestoreDataConverter,
  Timestamp
} from 'firebase/firestore';
import { buildVimeoEmbedUrl, mapVimeoCategoriesToGenre } from '@shared/services/vimeo';

export type VideoSource = 'vimeo' | 'youtube' | 'archive' | 'direct' | 'external';

export type TrailerDoc = {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  trailerType: VideoSource;
  trailerVideoId?: string;
  trailerUrl?: string;
  trailerDurationSeconds?: number;
  fullContentType: VideoSource;
  fullContentVideoId?: string;
  fullContentUrl?: string;
  fullContentDurationSeconds?: number;
  thumbnailUrl: string;
  likes?: number;
  shares?: number;
  reviews?: number;
  averageRating?: number;
  createdAt?: Timestamp;
  vimeoId?: string;
  vimeoCategories?: string[];
  durationSeconds?: number;
};

const converter: FirestoreDataConverter<TrailerDoc> = {
  toFirestore(value) {
    return value;
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    const vimeoCategories: string[] = data.vimeoCategories ?? [];
    const vimeoId: string | undefined = data.vimeoId ?? undefined;
    const derivedGenre = vimeoCategories.length ? mapVimeoCategoriesToGenre(vimeoCategories) : 'Unknown';
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
      vimeoId,
      vimeoCategories,
      durationSeconds: data.durationSeconds
    };
  }
};

export function subscribeToPublicContent(
  callback: (items: TrailerDoc[]) => void,
  onError?: (error: Error) => void,
  pageSize: number = 20
) {
  const db = getFirestore(getFirebaseApp());
  const q = query(
    collection(db, 'publicContent').withConverter(converter),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
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

export async function toggleLike(userId: string, contentId: string): Promise<boolean> {
  const db = getFirestore(getFirebaseApp());
  const engagementId = `${userId}_${contentId}_like`;
  const engagementRef = doc(db, 'engagements', engagementId);
  const contentRef = doc(db, 'publicContent', contentId);

  const engagementsQuery = query(
    collection(db, 'engagements'),
    where('userId', '==', userId),
    where('contentId', '==', contentId),
    where('type', '==', 'like')
  );
  const snapshot = await getDocs(engagementsQuery);

  if (!snapshot.empty) {
    await deleteDoc(engagementRef);
    await updateDoc(contentRef, { likes: increment(-1) });
    return false;
  } else {
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

  if (isNewReview) {
    await updateDoc(contentRef, { reviews: increment(1) });
  }

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

// ============================================================================
// WATCH PARTY FUNCTIONS
// ============================================================================

export type WatchPartyStatus = 'waiting' | 'playing' | 'paused' | 'ended';
export type PartyPlatform = 'mobile' | 'web' | 'roku';

export type WatchPartyParticipant = {
  userId: string;
  displayName: string;
  platform: PartyPlatform;
  joinedAt: Timestamp;
};

export type WatchParty = {
  id: string;
  code: string;
  hostUserId: string;
  contentId: string;
  contentTitle: string;
  videoUrl: string;
  status: WatchPartyStatus;
  currentTime: number;
  lastSync: Timestamp;
  participants: WatchPartyParticipant[];
  maxParticipants: number;
  createdAt: Timestamp;
  endedAt?: Timestamp;
};

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createWatchParty(
  userId: string,
  displayName: string,
  platform: PartyPlatform,
  content: TrailerDoc
): Promise<WatchParty> {
  const db = getFirestore(getFirebaseApp());
  const code = generateJoinCode();
  const partyRef = doc(db, 'watchParties', code);

  const party: Omit<WatchParty, 'id'> = {
    code,
    hostUserId: userId,
    contentId: content.id,
    contentTitle: content.title,
    videoUrl: content.trailerVideoId || content.trailerUrl || '',
    status: 'waiting',
    currentTime: 0,
    lastSync: Timestamp.now(),
    participants: [{
      userId,
      displayName,
      platform,
      joinedAt: Timestamp.now()
    }],
    maxParticipants: 10,
    createdAt: Timestamp.now()
  };

  await setDoc(partyRef, party);
  return { id: code, ...party };
}

export async function joinWatchParty(
  code: string,
  userId: string,
  displayName: string,
  platform: PartyPlatform
): Promise<WatchParty> {
  const db = getFirestore(getFirebaseApp());
  const partyRef = doc(db, 'watchParties', code);
  const partySnap = await getDoc(partyRef);

  if (!partySnap.exists()) {
    throw new Error('Party not found');
  }

  const party = partySnap.data() as Omit<WatchParty, 'id'>;

  if (party.participants.some(p => p.userId === userId)) {
    return { ...party, id: partySnap.id };
  }

  if (party.participants.length >= party.maxParticipants) {
    throw new Error('Party is full');
  }

  const newParticipant: WatchPartyParticipant = {
    userId,
    displayName,
    platform,
    joinedAt: Timestamp.now()
  };

  await updateDoc(partyRef, {
    participants: [...party.participants, newParticipant]
  });

  return {
    ...party,
    participants: [...party.participants, newParticipant],
    id: partySnap.id
  };
}

export async function updateWatchPartyState(
  partyId: string,
  status: WatchPartyStatus,
  currentTime: number
): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const partyRef = doc(db, 'watchParties', partyId);

  await updateDoc(partyRef, {
    status,
    currentTime,
    lastSync: Timestamp.now()
  });
}

export async function leaveWatchParty(partyId: string, userId: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const partyRef = doc(db, 'watchParties', partyId);
  const partySnap = await getDoc(partyRef);

  if (!partySnap.exists()) return;

  const party = partySnap.data() as WatchParty;
  const updatedParticipants = party.participants.filter(p => p.userId !== userId);

  if (party.hostUserId === userId || updatedParticipants.length === 0) {
    await updateDoc(partyRef, {
      status: 'ended',
      endedAt: Timestamp.now()
    });
  } else {
    await updateDoc(partyRef, {
      participants: updatedParticipants
    });
  }
}

export type WatchPartyCallback = (party: WatchParty | null) => void;

export function subscribeToWatchParty(partyId: string, callback: WatchPartyCallback): () => void {
  const db = getFirestore(getFirebaseApp());
  const partyRef = doc(db, 'watchParties', partyId);

  const unsubscribe = onSnapshot(
    partyRef,
    snapshot => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as WatchParty);
      } else {
        callback(null);
      }
    },
    error => {
      console.error('Error subscribing to watch party:', error);
      callback(null);
    }
  );

  return unsubscribe;
}
