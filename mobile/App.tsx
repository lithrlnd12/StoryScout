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
  ImageBackground,
  ScrollView,
  Modal,
  Share
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { WebView } from 'react-native-webview';

import tokens from '../shared/tokens/colors.json';
import trailers from '../shared/mocks/trailers.json';
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

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const fallbackFeed: TrailerDoc[] = (trailers as any[]).map((item: any) => ({
  id: item.id,
  title: item.title,
  genre: item.genre,
  synopsis: item.synopsis,

  // Trailer (for feed) - uses same video as full content for now
  trailerType: 'vimeo' as const,
  trailerVideoId: item.vimeoId,
  trailerDurationSeconds: item.durationSeconds,

  // Full content (for Watch Now)
  fullContentType: 'vimeo' as const,
  fullContentVideoId: item.vimeoId,
  fullContentDurationSeconds: item.durationSeconds,

  thumbnailUrl: item.thumbnailUrl ?? '',
  likes: item.likes ?? 0,
  shares: item.shares ?? 0,
  reviews: item.reviews ?? 0,
  averageRating: item.averageRating ?? 0,
  vimeoId: item.vimeoId,
  vimeoCategories: item.vimeoCategories,
  durationSeconds: item.durationSeconds
}));

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
  const listRef = useRef<FlatList<TrailerDoc>>(null);

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
      const activeId = viewableItems[0].item.id;
      const index = filteredFeed.findIndex(item => item.id === activeId);
      if (index >= 0) {
        setCurrentIndex(index);
      }
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
    const videoId = item.fullContentVideoId || item.vimeoId;
    if (!videoId) return;
    setWatchingFull(videoId);
  };

  const handleSave = () => {
    // Placeholder for future watchlist functionality
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

  const truncateText = (text: string, maxLength: number) => {
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

  const renderItem = ({ item }: { item: TrailerDoc }) => {
    const isExpanded = expandedSynopsis[item.id];
    const synopsisText = isExpanded ? item.synopsis : truncateText(item.synopsis, 100);
    const isLiked = likedItems[item.id] || false;

    return (
      <View style={styles.cardContainer}>
        <ImageBackground
          source={{ uri: item.thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        >
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
            <Text style={styles.title}>{item.title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Text style={styles.synopsis}>{synopsisText}</Text>
              {item.synopsis.length > 100 && (
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
            </View>
          </View>
        </ImageBackground>
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
    const fullVideoSrc = `https://player.vimeo.com/video/${watchingFull}?autoplay=1&title=0&byline=0&portrait=0`;
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
          <WebView
            source={{ uri: fullVideoSrc }}
            style={{ flex: 1 }}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
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
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
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
    paddingTop: 8,
    paddingBottom: 16,
    columnGap: 10
  },
  genrePill: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: tokens.borderDefault,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(15,18,26,0.4)'
  },
  genrePillActive: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: tokens.accentMagenta,
    borderWidth: 0
  },
  genrePillText: {
    color: tokens.textSecondary,
    fontWeight: '500'
  },
  genrePillTextActive: {
    color: tokens.textPrimary,
    fontWeight: '600'
  },
  cardContainer: {
    height: ITEM_HEIGHT,
    width: '100%'
  },
  thumbnail: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end'
  },
  engagementBar: {
    position: 'absolute',
    right: 12,
    bottom: '35%',
    alignItems: 'center',
    gap: 24,
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
    padding: 24,
    paddingBottom: 60,
    paddingRight: 80,
    backgroundColor: 'rgba(15,18,26,0.75)'
  },
  genre: {
    color: tokens.accentCyan,
    marginBottom: 8,
    fontWeight: '600'
  },
  title: {
    color: tokens.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4
  },
  synopsis: {
    color: tokens.textSecondary,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 20
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
  }
});
