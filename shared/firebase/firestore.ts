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
  startAfter,
  type FirestoreDataConverter,
  type DocumentSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseApp } from './client';
import { buildVimeoEmbedUrl, mapVimeoCategoriesToGenre } from '../services/vimeo';

export type VideoSource = 'vimeo' | 'youtube' | 'archive' | 'direct' | 'external';

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

// Watch Party Types
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
  code: string;              // 6-character join code
  hostUserId: string;
  contentId: string;
  contentTitle: string;
  videoUrl: string;          // Direct MP4 URL from Internet Archive

  // Playback state
  status: WatchPartyStatus;
  currentTime: number;       // Seconds
  lastSync: Timestamp;

  // Participants
  participants: WatchPartyParticipant[];
  maxParticipants: number;   // Default: 10

  // Metadata
  createdAt: Timestamp;
  endedAt?: Timestamp;
};

export type WatchPartyChatMessage = {
  id: string;
  partyId: string;
  userId: string;
  displayName: string;
  message: string;
  timestamp: Timestamp;
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

// Subscribe to initial batch of content (paginated)
export function subscribeToPublicContent(callback: PublicContentCallback, onError?: (error: Error) => void, pageSize: number = 20) {
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

// Load more content (for infinite scroll)
export async function loadMorePublicContent(
  lastDoc: DocumentSnapshot | null,
  pageSize: number = 20
): Promise<{ items: TrailerDoc[]; lastDoc: DocumentSnapshot | null }> {
  const db = getFirestore(getFirebaseApp());

  const constraints = [
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc) as any);
  }

  const q = query(
    collection(db, 'publicContent').withConverter(converter),
    ...constraints
  );

  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(doc => doc.data());
  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { items, lastDoc: newLastDoc };
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

// ============================================================================
// WATCH PARTY FUNCTIONS
// ============================================================================

/**
 * Generate a random 6-character join code (uppercase letters and numbers only)
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Uppercase only, exclude confusing chars (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new watch party
 */
export async function createWatchParty(
  userId: string,
  displayName: string,
  platform: PartyPlatform,
  content: TrailerDoc
): Promise<WatchParty> {
  const db = getFirestore(getFirebaseApp());
  const code = generateJoinCode();

  // Use the code as the document ID for easy lookup
  const partyRef = doc(db, 'watchParties', code);

  const party: Omit<WatchParty, 'id'> = {
    code,
    hostUserId: userId,
    contentId: content.id,
    contentTitle: content.title,
    videoUrl: content.fullContentVideoId || content.fullContentUrl || '',
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

/**
 * Join an existing watch party
 */
export async function joinWatchParty(
  code: string,
  userId: string,
  displayName: string,
  platform: PartyPlatform
): Promise<WatchParty> {
  const db = getFirestore(getFirebaseApp());
  const partyRef = doc(db, 'watchParties', code);

  // Get the document directly by ID (code is the document ID)
  const partySnap = await getDoc(partyRef);

  if (!partySnap.exists()) {
    throw new Error('Party not found');
  }

  const party = partySnap.data() as Omit<WatchParty, 'id'>;

  // Check if already in party
  if (party.participants.some(p => p.userId === userId)) {
    return { ...party, id: partySnap.id };
  }

  // Check if party is full
  if (party.participants.length >= party.maxParticipants) {
    throw new Error('Party is full');
  }

  // Add participant
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

/**
 * Update watch party playback state (host only)
 */
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

/**
 * Leave a watch party
 */
export async function leaveWatchParty(partyId: string, userId: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const partyRef = doc(db, 'watchParties', partyId);

  // Get the document directly by ID
  const partySnap = await getDoc(partyRef);

  if (!partySnap.exists()) return;

  const party = partySnap.data() as Omit<WatchParty, 'id'>;
  const updatedParticipants = party.participants.filter(p => p.userId !== userId);

  // If host leaves or no participants left, end the party
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

/**
 * Subscribe to watch party updates (real-time)
 */
export type WatchPartyCallback = (party: WatchParty | null) => void;

export function subscribeToWatchParty(partyId: string, callback: WatchPartyCallback): () => void {
  const db = getFirestore(getFirebaseApp());
  const partyRef = doc(db, 'watchParties', partyId);

  console.log('[Firestore] Creating subscription for party:', partyId);

  const unsubscribe = onSnapshot(
    partyRef,
    snapshot => {
      console.log('[Firestore] Snapshot received for party:', partyId, 'exists:', snapshot.exists());
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('[Firestore] Party data:', { status: data.status, currentTime: data.currentTime, participants: data.participants?.length });
        callback({ id: snapshot.id, ...data } as WatchParty);
      } else {
        console.log('[Firestore] Party document does not exist');
        callback(null);
      }
    },
    error => {
      console.error('[Firestore] Error subscribing to watch party:', error);
      callback(null);
    }
  );

  console.log('[Firestore] Subscription created successfully for:', partyId);
  return unsubscribe;
}

/**
 * Get watch party by code (for REST API / Roku)
 */
export async function getWatchParty(code: string): Promise<WatchParty | null> {
  const db = getFirestore(getFirebaseApp());
  const partyRef = doc(db, 'watchParties', code);

  // Get the document directly by ID
  const partySnap = await getDoc(partyRef);

  if (!partySnap.exists()) return null;

  return { id: partySnap.id, ...partySnap.data() } as WatchParty;
}
