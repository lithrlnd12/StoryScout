import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  Modal,
  Share,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Video, ResizeMode } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';

import tokens from '../shared/tokens/colors.json';
import archiveContent from '../shared/mocks/archive-content.json';
import {
  subscribeToPublicContent,
  toggleLike,
  shareContent,
  getUserEngagement,
  submitReview,
  type TrailerDoc
} from '../shared/firebase/firestore';
import {
  subscribeToAuthChanges,
  signInWithEmail,
  signUpWithEmail,
  signOutFirebase,
  type User
} from '../shared/firebase/auth';
import WatchPartyComponent from './src/components/WatchParty';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const fallbackFeed: TrailerDoc[] = (archiveContent as any[]).map((item: any) => ({
  id: item.id,
  title: item.title,
  genre: item.genre,
  synopsis: item.synopsis,

  // Trailer (for feed) - direct MP4 URL from Internet Archive
  trailerType: 'direct' as const,
  trailerVideoId: item.trailerVideoId, // Full URL to MP4
  trailerDurationSeconds: item.trailerDurationSeconds,

  // Full content (for Watch Now)
  fullContentType: 'direct' as const,
  fullContentVideoId: item.fullContentVideoId,
  fullContentDurationSeconds: item.fullContentDurationSeconds,

  thumbnailUrl: item.thumbnailUrl ?? '',
  likes: item.likes ?? 0,
  shares: item.shares ?? 0,
  reviews: item.reviews ?? 0,
  averageRating: item.averageRating ?? 0
}));

console.log('📦 Loaded fallback feed:', fallbackFeed.length, 'items');
console.log('🎬 First video URL:', fallbackFeed[0]?.trailerVideoId);

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = SCREEN_HEIGHT;

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80
};

type AuthMode = 'signin' | 'signup';

type ViewableCallback = {
  viewableItems: Array<{ item: TrailerDoc }>;
  changed: Array<{ item: TrailerDoc }>;
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [feed, setFeed] = useState<TrailerDoc[]>(fallbackFeed);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedSynopsis, setExpandedSynopsis] = useState<Record<string, boolean>>({});
  const [watchingFull, setWatchingFull] = useState<string | null>(null);
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [showReviewModal, setShowReviewModal] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isGloballyMuted, setIsGloballyMuted] = useState(true);
  const [currentContent, setCurrentContent] = useState<TrailerDoc | null>(null);
  const [showWatchPartyMenu, setShowWatchPartyMenu] = useState(false);
  const listRef = useRef<FlatList<TrailerDoc>>(null);
  const videoRefs = useRef<Record<string, Video | null>>({});

  useEffect(() => {
    const prepare = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      setReady(true);
      SplashScreen.hideAsync().catch(() => undefined);
    };
    prepare();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(current => {
      setUser(current);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setFeed(fallbackFeed);
      return;
    }
    const unsubscribe = subscribeToPublicContent(items => {
      if (items.length) {
        setFeed(items);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    feed.forEach(trailer => {
      if (trailer.genre) {
        set.add(trailer.genre);
      }
    });
    return ['All', ...Array.from(set)];
  }, [feed]);

  const filteredFeed = useMemo(() => {
    if (selectedGenre === 'All') {
      return feed;
    }
    return feed.filter(trailer =>
      trailer.genre?.toLowerCase() === selectedGenre.toLowerCase()
    );
  }, [feed, selectedGenre]);

  useEffect(() => {
    setCurrentIndex(0);
    if (listRef.current) {
      listRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [selectedGenre]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: ViewableCallback) => {
    if (viewableItems.length > 0) {
      const activeItem = viewableItems[0].item;
      const activeId = activeItem.id;
      const index = filteredFeed.findIndex(item => item.id === activeId);
      if (index >= 0) {
        setCurrentIndex(index);
      }

      // Track current content for watch party
      setCurrentContent(activeItem);

      // Play the visible video, pause all others
      Object.keys(videoRefs.current).forEach(async (videoId) => {
        const videoRef = videoRefs.current[videoId];
        if (videoRef) {
          try {
            if (videoId === activeId) {
              await videoRef.playAsync();
            } else {
              await videoRef.pauseAsync();
            }
          } catch (error) {
            // Ignore video control errors
          }
        }
      });
    }
  }, [filteredFeed]);

  const handleAuthSubmit = async () => {
    if (!email || !password) {
      setAuthError('Please enter email and password.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
      setEmail('');
      setPassword('');
    } catch (error: any) {
      setAuthError(error?.message ?? 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutFirebase().catch(() => undefined);
  };

  const handleWatchFull = (item: TrailerDoc) => {
    const videoUrl = item.fullContentVideoId;
    if (!videoUrl) return;
    console.log('[App] Setting watchingFull to:', videoUrl);
    setWatchingFull(videoUrl);
  };

  const handleSave = () => {
    Alert.alert('Coming soon', 'Watchlist support is coming soon—stay tuned!');
  };

  const handleLike = async (contentId: string) => {
    if (!user) return;
    try {
      const isLiked = await toggleLike(user.uid, contentId);
      setLikedItems(prev => ({ ...prev, [contentId]: isLiked }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async (item: TrailerDoc) => {
    if (!user) return;
    try {
      await Share.share({
        message: `Check out ${item.title} on Story Scout!`,
        title: item.title
      });
      await shareContent(user.uid, item.id);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReviewPress = (contentId: string) => {
    setShowReviewModal(contentId);
    setReviewRating(5);
    setReviewText('');
  };

  const handleSubmitReview = async () => {
    if (!user || !showReviewModal) return;
    setSubmittingReview(true);
    try {
      await submitReview(user.uid, showReviewModal, reviewRating, reviewText);
      setShowReviewModal(null);
      setReviewText('');
      setReviewRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleMute = () => {
    setIsGloballyMuted(prev => {
      const newMutedState = !prev;
      // Update all video refs to match new muted state
      Object.values(videoRefs.current).forEach(video => {
        if (video) {
          video.setIsMutedAsync(newMutedState);
        }
      });
      return newMutedState;
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const truncateTitle = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Load user engagement state when feed changes
  useEffect(() => {
    if (!user) return;

    const loadEngagements = async () => {
      const engagements: Record<string, boolean> = {};
      for (const item of feed) {
        try {
          const { hasLiked } = await getUserEngagement(user.uid, item.id);
          engagements[item.id] = hasLiked;
        } catch (error) {
          console.error('Error loading engagement:', error);
        }
      }
      setLikedItems(engagements);
    };

    loadEngagements();
  }, [feed, user]);

  if (!ready) {
    return null;
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.authContainer]}>
        <StatusBar style="light" />
        <View style={styles.authCard}>
          <Text style={styles.appTitle}>Story Scout</Text>
          <Text style={styles.authSubtitle}>
            {authMode === 'signin' ? 'Sign in to continue discovering trailers.' : 'Create an account to start scouting stories.'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={tokens.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          <TouchableOpacity style={styles.primaryCta} onPress={handleAuthSubmit} disabled={authLoading}>
            {authLoading ? <ActivityIndicator color={tokens.textPrimary} /> : <Text style={styles.primaryCtaText}>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.authToggle}
            onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            disabled={authLoading}
          >
            <Text style={styles.authToggleText}>
              {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item, index }: { item: TrailerDoc; index: number }) => {
    const isExpanded = expandedSynopsis[item.id];
    const synopsisText = isExpanded ? item.synopsis : truncateText(item.synopsis, 60);
    const titleText = truncateTitle(item.title);
    const isLiked = likedItems[item.id] || false;
    const videoUrl = item.trailerVideoId; // Direct MP4 URL from Internet Archive
    const isActive = index === currentIndex;

    if (index === 0) {
      console.log('🎥 Rendering first video:', videoUrl, 'isActive:', isActive);
    }

    return (
      <View style={styles.cardContainer}>
        <Video
          ref={(ref) => {
            if (ref) {
              videoRefs.current[item.id] = ref;
            }
          }}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isActive}
          isLooping
          isMuted={isGloballyMuted}
          useNativeControls={false}
          posterSource={{ uri: item.thumbnailUrl }}
          usePoster
        />

        {/* Mute/Unmute button */}
        <TouchableOpacity
          onPress={toggleMute}
          style={styles.muteButton}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 24 }}>{isGloballyMuted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>

        {/* TikTok-style engagement bar */}
        <View style={styles.engagementBar}>
            {/* Like button */}
            <TouchableOpacity
              style={styles.engagementButton}
              onPress={() => handleLike(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.engagementIcon}>
                  {isLiked ? '❤️' : '🤍'}
                </Text>
              </View>
              <Text style={styles.engagementCount}>
                {item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)}K` : item.likes || 0}
              </Text>
            </TouchableOpacity>

            {/* Review button */}
            <TouchableOpacity
              style={styles.engagementButton}
              onPress={() => handleReviewPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.engagementIcon}>💬</Text>
              </View>
              <Text style={styles.engagementCount}>
                {item.reviews >= 1000 ? `${(item.reviews / 1000).toFixed(1)}K` : item.reviews || 0}
              </Text>
            </TouchableOpacity>

            {/* Share button */}
            <TouchableOpacity
              style={styles.engagementButton}
              onPress={() => handleShare(item)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.engagementIcon}>↗️</Text>
              </View>
              <Text style={styles.engagementCount}>
                {item.shares >= 1000 ? `${(item.shares / 1000).toFixed(1)}K` : item.shares || 0}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.videoOverlay}>
            <Text style={styles.genre}>{item.genre}</Text>
            <Text style={styles.title}>{titleText}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Text style={styles.synopsis}>{synopsisText}</Text>
              {item.synopsis.length > 60 && (
                <TouchableOpacity onPress={() => setExpandedSynopsis({ ...expandedSynopsis, [item.id]: !isExpanded })}>
                  <Text style={[styles.synopsis, { fontWeight: '700', marginLeft: 4 }]}>
                    {isExpanded ? 'less' : 'more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.primaryCta} onPress={() => handleWatchFull(item)}>
                <Text style={styles.primaryCtaText}>Watch Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryCta} onPress={handleSave}>
                <Text style={styles.secondaryCtaText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={() => setShowWatchPartyMenu(true)}
              >
                <Text style={styles.secondaryCtaText}>👥</Text>
              </TouchableOpacity>
            </View>
          </View>
      </View>
    );
  };

  if (showReviewModal) {
    const currentItem = feed.find(item => item.id === showReviewModal);
    return (
      <Modal visible={true} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {currentItem && (
              <Text style={styles.reviewItemTitle}>{currentItem.title}</Text>
            )}

            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                    <Text style={styles.starIcon}>
                      {star <= reviewRating ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Share your thoughts..."
              placeholderTextColor={tokens.textMuted}
              multiline
              numberOfLines={4}
              value={reviewText}
              onChangeText={setReviewText}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.primaryCta, submittingReview && styles.ctaDisabled]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color={tokens.textPrimary} />
              ) : (
                <Text style={styles.primaryCtaText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (watchingFull) {
    console.log('[App] Rendering full movie modal for:', watchingFull);
    return (
      <Modal visible={true} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: tokens.backgroundPrimary }}>
          <StatusBar style="light" />
          <TouchableOpacity
            onPress={() => setWatchingFull(null)}
            style={{
              position: 'absolute',
              top: 50,
              left: 20,
              zIndex: 1000,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 24,
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ color: tokens.textPrimary, fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <Video
            source={{ uri: watchingFull }}
            style={{ flex: 1 }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls
            isMuted={false}
          />
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Welcome, {user.email ?? 'Scout'}</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreRow}
      >
        {genres.map(genre => (
          <TouchableOpacity
            key={genre}
            style={genre === selectedGenre ? styles.genrePillActive : styles.genrePill}
            onPress={() => setSelectedGenre(genre)}
          >
            <Text style={genre === selectedGenre ? styles.genrePillTextActive : styles.genrePillText}>{genre}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        ref={listRef}
        data={filteredFeed}
        renderItem={({ item, index }) => renderItem({ item, index })}
        keyExtractor={item => item.id}
        pagingEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
      />

      {/* Watch Party Component */}
      <WatchPartyComponent
        user={user}
        currentContent={currentContent}
        videoRef={{ current: currentContent ? videoRefs.current[currentContent.id] || null : null }}
        showMenu={showWatchPartyMenu}
        onMenuClose={() => setShowWatchPartyMenu(false)}
        onPartyStateChange={(inParty) => {
          console.log('[App] Watch party state changed:', inParty);
        }}
        onWatchFullMovie={(videoUrl) => {
          console.log('[App] onWatchFullMovie called with:', videoUrl);
          setShowWatchPartyMenu(false); // Close the watch party menu
          setWatchingFull(videoUrl);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.backgroundPrimary
  },
  authContainer: {
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  authCard: {
    backgroundColor: tokens.backgroundSecondary,
    borderRadius: 16,
    padding: 24
  },
  appTitle: {
    color: tokens.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center'
  },
  authSubtitle: {
    color: tokens.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24
  },
  input: {
    backgroundColor: tokens.backgroundPrimary,
    color: tokens.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12
  },
  errorText: {
    color: tokens.error,
    textAlign: 'center',
    marginBottom: 12
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerText: {
    color: tokens.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  signOutText: {
    color: tokens.accentCyan,
    fontWeight: '600'
  },
  genreRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    columnGap: 10,
    alignItems: 'center'
  },
  genrePill: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: tokens.borderDefault,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(50,55,70,0.8)',
    minWidth: 80,
    height: 40,
    justifyContent: 'center'
  },
  genrePillActive: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: tokens.accentMagenta,
    borderWidth: 0,
    minWidth: 80,
    height: 40,
    justifyContent: 'center'
  },
  genrePillText: {
    color: tokens.textPrimary,
    fontWeight: '500',
    textAlign: 'center'
  },
  genrePillTextActive: {
    color: tokens.textPrimary,
    fontWeight: '600',
    textAlign: 'center'
  },
  cardContainer: {
    height: ITEM_HEIGHT,
    width: '100%'
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%'
  },
  engagementBar: {
    position: 'absolute',
    right: 12,
    bottom: '25%',
    alignItems: 'center',
    gap: 20,
    zIndex: 10
  },
  engagementButton: {
    alignItems: 'center',
    gap: 6
  },
  iconContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 28,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  engagementIcon: {
    fontSize: 28
  },
  engagementCount: {
    color: tokens.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 70,
    paddingRight: 80,
    backgroundColor: 'rgba(15,18,26,0.85)'
  },
  genre: {
    color: tokens.accentCyan,
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 12
  },
  title: {
    color: tokens.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 24
  },
  synopsis: {
    color: tokens.textSecondary,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 18,
    fontSize: 13
  },
  ctaRow: {
    flexDirection: 'row',
    columnGap: 12
  },
  primaryCta: {
    backgroundColor: tokens.accentMagenta,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24
  },
  primaryCtaText: {
    color: tokens.textPrimary,
    fontWeight: '600'
  },
  secondaryCta: {
    borderColor: tokens.textPrimary,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24
  },
  secondaryCtaText: {
    color: tokens.textPrimary,
    fontWeight: '600'
  },
  authToggle: {
    marginTop: 12
  },
  authToggleText: {
    color: tokens.accentCyan,
    textAlign: 'center',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end'
  },
  reviewModal: {
    backgroundColor: tokens.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    color: tokens.textPrimary,
    fontSize: 20,
    fontWeight: '700'
  },
  modalClose: {
    color: tokens.textSecondary,
    fontSize: 28,
    fontWeight: '300'
  },
  reviewItemTitle: {
    color: tokens.textSecondary,
    fontSize: 14,
    marginBottom: 20
  },
  ratingContainer: {
    marginBottom: 20
  },
  ratingLabel: {
    color: tokens.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8
  },
  starIcon: {
    fontSize: 36
  },
  reviewInput: {
    backgroundColor: tokens.backgroundPrimary,
    color: tokens.textPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 120,
    fontSize: 16
  },
  ctaDisabled: {
    opacity: 0.6
  },
  muteButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
