
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFirebaseAnalytics } from './firebaseClient';
import {
  subscribeToPublicContent,
  toggleLike,
  shareContent,
  getUserEngagement,
  submitReview,
  type TrailerDoc
} from './firebaseFirestore';
import {
  subscribeToAuthChanges,
  signInWithEmail,
  signUpWithEmail,
  signOutFirebase,
  type User
} from './firebaseAuth';
import WatchPartyComponent from './components/WatchParty';
import tokens from '@tokens/colors.json';
import archiveContent from '@mocks/archive-content.json';

const gradients = tokens.accentGradient as string[];
const fallbackFeed: TrailerDoc[] = (archiveContent as any[]).map((item: any) => ({
  id: item.id,
  title: item.title,
  genre: item.genre,
  synopsis: item.synopsis,

  // Direct MP4 URL from Internet Archive
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

type AuthMode = 'signin' | 'signup';

export default function App() {
  const [trailers, setTrailers] = useState<TrailerDoc[]>(fallbackFeed);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [expandedSynopsis, setExpandedSynopsis] = useState<Record<string, boolean>>({});
  const [watchingFull, setWatchingFull] = useState<string | null>(null);
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [showReviewModal, setShowReviewModal] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isGloballyMuted, setIsGloballyMuted] = useState(true); // Global mute state
  const [showWatchPartyMenu, setShowWatchPartyMenu] = useState(false);
  const [activePartyId, setActivePartyId] = useState<string | null>(null); // Track active party ID
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Track if voice chat is enabled for the party
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const fullVideoRef = useRef<HTMLVideoElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const navigationDisabled = useMemo(
    () => Boolean(showReviewModal) || Boolean(watchingFull) || showWatchPartyMenu,
    [showReviewModal, watchingFull, showWatchPartyMenu]
  );
  const wheelListenerOptions = useMemo(() => ({ passive: false } as AddEventListenerOptions), []);

  useEffect(() => {
    getFirebaseAnalytics().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const node = document.createElement('div');
    node.id = 'watch-party-overlay-root';
    Object.assign(node.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      pointerEvents: 'none',
      zIndex: '2147483647' // Higher than fullscreen video container (9999) and max safe z-index
    });
    document.body.appendChild(node);
    setOverlayHost(node);
    return () => {
      document.body.removeChild(node);
      setOverlayHost(null);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(current => {
      setUser(current);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setTrailers(fallbackFeed);
      return;
    }
    const unsubscribe = subscribeToPublicContent(items => {
      if (items.length) {
        setTrailers(items);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    trailers.forEach(trailer => {
      if (trailer.genre) {
        set.add(trailer.genre);
      }
    });
    return ['All', ...Array.from(set)];
  }, [trailers]);

  const filteredTrailers = useMemo(() => {
    if (selectedGenre === 'All') {
      return trailers;
    }
    return trailers.filter(trailer =>
      trailer.genre?.toLowerCase() === selectedGenre.toLowerCase()
    );
  }, [trailers, selectedGenre]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedGenre, filteredTrailers.length]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      // Loop infinitely: wrap around when reaching the end or beginning
      let newIndex = nextIndex;
      if (nextIndex >= filteredTrailers.length) {
        newIndex = 0; // Loop to beginning
      } else if (nextIndex < 0) {
        newIndex = filteredTrailers.length - 1; // Loop to end
      }

      if (newIndex === currentIndex) return;
      setTransitioning(true);
      setCurrentIndex(newIndex);
      setTimeout(() => setTransitioning(false), 300); // Faster transition

      // Play/pause videos based on active index
      filteredTrailers.forEach((trailer, idx) => {
        const video = videoRefs.current[trailer.id];
        if (video) {
          if (idx === newIndex) {
            video.play().catch(() => {
              // Autoplay might be blocked, user needs to interact first
              console.log('Autoplay blocked for:', trailer.title);
            });
          } else {
            video.pause();
            video.currentTime = 0; // Reset video to start
          }
        }
      });
    },
    [currentIndex, filteredTrailers]
  );

  useEffect(() => {
    if (navigationDisabled) {
      setTransitioning(false);
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (transitioning) return;
      if (event.deltaY > 10) {
        event.preventDefault();
        goToIndex(currentIndex + 1);
      } else if (event.deltaY < -10) {
        event.preventDefault();
        goToIndex(currentIndex - 1);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (transitioning) return;
      if (event.key === 'ArrowDown' || event.key === 's') {
        goToIndex(currentIndex + 1);
      } else if (event.key === 'ArrowUp' || event.key === 'w') {
        goToIndex(currentIndex - 1);
      }
    };

    window.addEventListener('wheel', handleWheel, wheelListenerOptions);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('wheel', handleWheel, wheelListenerOptions);
      window.removeEventListener('keydown', handleKey);
    };
  }, [currentIndex, transitioning, filteredTrailers.length, goToIndex, navigationDisabled, wheelListenerOptions]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setAuthError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setAuthError(null);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
      setEmail('');
      setPassword('');
    } catch (error: any) {
      setAuthError(error?.message ?? 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutFirebase().catch(() => undefined);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
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
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Check out ${item.title} on Story Scout!`,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
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

  const toggleMute = () => {
    setIsGloballyMuted(prev => {
      const newMutedState = !prev;
      // Update all video refs to match new muted state
      Object.values(videoRefs.current).forEach(video => {
        if (video) {
          video.muted = newMutedState;
        }
      });
      return newMutedState;
    });
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

  // Load user engagement state when trailers change
  useEffect(() => {
    if (!user) return;

    const loadEngagements = async () => {
      const engagements: Record<string, boolean> = {};
      for (const item of trailers) {
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
  }, [trailers, user]);

  const renderCard = (trailer: TrailerDoc, index: number) => {
    const isActive = index === currentIndex;

    // Use direct MP4 URL from Internet Archive
    const videoUrl = trailer.trailerVideoId;
    const transform = 'translateY(' + (index - currentIndex) * 100 + 'vh)';
    const isExpanded = expandedSynopsis[trailer.id];
    const synopsisText = isExpanded ? trailer.synopsis : truncateText(trailer.synopsis, 100);
    const isLiked = likedItems[trailer.id] || false;

    return (
      <section
        key={trailer.id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
          transform
        }}
      >
        <div style={cardStyle}>
          <div style={videoShellStyle}>
            {videoUrl ? (
              <video
                ref={(el) => {
                  if (el) videoRefs.current[trailer.id] = el;
                }}
                src={videoUrl}
                muted={isGloballyMuted}
                loop
                playsInline
                style={iframeStyle}
                poster={trailer.thumbnailUrl}
                onLoadStart={() => console.log('🎬 Video loading:', trailer.title)}
                onLoadedData={() => {
                  console.log('✅ Video loaded:', trailer.title);
                  // Try to play if this is the active video
                  if (isActive) {
                    const video = videoRefs.current[trailer.id];
                    if (video) {
                      video.play().catch((err) => {
                        console.log('⚠️ Autoplay blocked, click to play:', err.message);
                      });
                    }
                  }
                }}
                onError={(e) => console.error('❌ Video error:', trailer.title, e)}
              />
            ) : (
              <div
                style={{
                  ...iframeStyle,
                  backgroundImage: 'url(' + trailer.thumbnailUrl + ')',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            )}

            {/* Mute/Unmute button */}
            <button
              onClick={toggleMute}
              style={muteButtonStyle}
              aria-label={isGloballyMuted ? 'Unmute' : 'Mute'}
            >
              <span style={{ fontSize: 24 }}>{isGloballyMuted ? '🔇' : '🔊'}</span>
            </button>

            {/* TikTok-style engagement bar */}
            <div style={engagementBarStyle}>
              {/* Like button */}
              <button style={engagementButtonStyle} onClick={() => handleLike(trailer.id)}>
                <div style={iconContainerStyle}>
                  <span style={engagementIconStyle}>
                    {isLiked ? '❤️' : '🤍'}
                  </span>
                </div>
                <span style={engagementCountStyle}>
                  {(trailer.likes ?? 0) >= 1000 ? `${((trailer.likes ?? 0) / 1000).toFixed(1)}K` : trailer.likes ?? 0}
                </span>
              </button>

              {/* Review button */}
              <button style={engagementButtonStyle} onClick={() => handleReviewPress(trailer.id)}>
                <div style={iconContainerStyle}>
                  <span style={engagementIconStyle}>💬</span>
                </div>
                <span style={engagementCountStyle}>
                  {(trailer.reviews ?? 0) >= 1000 ? `${((trailer.reviews ?? 0) / 1000).toFixed(1)}K` : trailer.reviews ?? 0}
                </span>
              </button>

              {/* Share button */}
              <button style={engagementButtonStyle} onClick={() => handleShare(trailer)}>
                <div style={iconContainerStyle}>
                  <span style={engagementIconStyle}>↗️</span>
                </div>
                <span style={engagementCountStyle}>
                  {(trailer.shares ?? 0) >= 1000 ? `${((trailer.shares ?? 0) / 1000).toFixed(1)}K` : trailer.shares ?? 0}
                </span>
              </button>
            </div>

            <div style={overlayStyle}>
              <div style={metadataStyle}>
                <span style={genrePillStyle}>{trailer.genre}</span>
                <h2 style={{ margin: '12px 0 8px', fontSize: 24 }}>{trailer.title}</h2>
                <p style={{ color: tokens.textSecondary, maxWidth: 480, margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  {synopsisText}
                  {trailer.synopsis.length > 100 && (
                    <button
                      onClick={() => setExpandedSynopsis({ ...expandedSynopsis, [trailer.id]: !isExpanded })}
                      style={{
                        marginLeft: 6,
                        color: tokens.textPrimary,
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {isExpanded ? 'less' : 'more'}
                    </button>
                  )}
                </p>
                <div style={actionsRowStyle}>
                  <button
                    style={primaryButtonStyle}
                    onClick={() => setWatchingFull(trailer.fullContentVideoId || '')}
                  >
                    Watch Now
                  </button>
                  <button style={secondaryButtonStyle} onClick={() => alert('Watchlist coming soon!')}>
                    Save
                  </button>
                  <button style={secondaryButtonStyle} onClick={() => setShowWatchPartyMenu(true)}>
                    👥
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // Calculate current trailer early so it can be used in all render paths
  const currentTrailer = filteredTrailers[currentIndex] || null;

  if (showReviewModal) {
    const currentItem = trailers.find(item => item.id === showReviewModal);
    return (
      <div style={modalOverlayStyle}>
        <div style={reviewModalStyle}>
          <div style={modalHeaderStyle}>
            <h2 style={{ margin: 0, fontSize: 24, color: tokens.textPrimary }}>Write a Review</h2>
            <button onClick={() => setShowReviewModal(null)} style={modalCloseButtonStyle}>✕</button>
          </div>

          {currentItem && (
            <p style={{ color: tokens.textSecondary, marginBottom: 20 }}>{currentItem.title}</p>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: tokens.textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Rating
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 36, padding: 0 }}
                >
                  {star <= reviewRating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="Share your thoughts..."
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            style={reviewTextareaStyle}
          />

          <button
            onClick={handleSubmitReview}
            disabled={submittingReview}
            style={{ ...primaryButtonStyle, opacity: submittingReview ? 0.6 : 1 }}
          >
            {submittingReview ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    );
  }

  if (watchingFull && user) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: tokens.backgroundPrimary,
          zIndex: 9999,
          isolation: 'isolate' // Create new stacking context
        }}
      >
        <button
          onClick={() => setWatchingFull(null)}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 10000,
            backgroundColor: 'rgba(0,0,0,0.7)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            color: tokens.textPrimary,
            fontSize: 24,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ←
        </button>
        <video
          ref={fullVideoRef}
          src={watchingFull}
          autoPlay
          controls
          controlsList="nodownload nofullscreen"
          disablePictureInPicture
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            zIndex: 1
          }}
        />
        {/* Watch Party Component - pass null to render chat inline instead of using portal */}
        <WatchPartyComponent
          user={user}
          currentContent={currentTrailer}
          videoRef={fullVideoRef}
          showMenu={showWatchPartyMenu}
          onMenuClose={() => setShowWatchPartyMenu(false)}
          onPartyStateChange={(inParty, partyId) => {
            console.log('Watch party state changed:', inParty, 'Party ID:', partyId);
            setActivePartyId(inParty ? partyId || null : null);
          }}
          onWatchFullMovie={(videoUrl) => {
            setWatchingFull(videoUrl);
          }}
          overlayRoot={null}
          partyId={activePartyId}
          voiceEnabled={voiceEnabled}
          onVoiceEnabledChange={setVoiceEnabled}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={authContainerStyle}>
        <form onSubmit={handleAuthSubmit} style={authCardStyle}>
          <img src="/storyscout-logo.png" alt="Story Scout" style={{ width: 96, alignSelf: 'center' }} />
          <h1 style={{ color: tokens.textPrimary, textAlign: 'center', marginTop: 16 }}>Story Scout</h1>
          <p style={{ color: tokens.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            {mode === 'signin' ? 'Sign in to discover your next story.' : 'Create an account to start scouting stories.'}
          </p>
          <label style={labelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              style={inputStyle}
              required
            />
          </label>
          <label style={labelStyle}>
            Password
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              style={inputStyle}
              required
            />
          </label>
          {authError ? <p style={{ color: tokens.error, textAlign: 'center' }}>{authError}</p> : null}
          <button type="submit" style={primaryButtonStyle} disabled={loading}>
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
          <button
            type="button"
            style={{ ...secondaryButtonStyle, marginTop: 12 }}
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            disabled={loading}
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={appRootStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/storyscout-logo.png" alt="Story Scout" style={{ width: 48 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>Story Scout</h1>
            <p style={{ margin: 0, color: tokens.textSecondary }}>Welcome, {user.email ?? 'Scout'}</p>
          </div>
        </div>
        <button style={secondaryButtonStyle} onClick={handleSignOut}>Sign Out</button>
      </header>

      <div style={genreBarStyle}>
        {genres.map(genre => (
          <button
            key={genre}
            style={genre === selectedGenre ? genreButtonActiveStyle : genreButtonStyle}
            onClick={() => setSelectedGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      <div ref={containerRef} style={feedViewportStyle}>
        {filteredTrailers.map(renderCard)}
        {filteredTrailers.length === 0 && (
          <div style={emptyStateStyle}>
            <h2>No trailers available yet</h2>
            <p style={{ color: tokens.textSecondary }}>We're busy scouting more stories for this genre.</p>
          </div>
        )}
      </div>

      {/* Watch Party Component */}
      <WatchPartyComponent
        user={user}
        currentContent={currentTrailer}
        videoRef={{ current: currentTrailer ? videoRefs.current[currentTrailer.id] || null : null }}
        showMenu={showWatchPartyMenu}
        onMenuClose={() => setShowWatchPartyMenu(false)}
        onPartyStateChange={(inParty, partyId) => {
          console.log('Watch party state changed:', inParty, 'Party ID:', partyId);
          setActivePartyId(inParty ? partyId || null : null);
        }}
        onWatchFullMovie={(videoUrl) => {
          setWatchingFull(videoUrl);
        }}
        overlayRoot={overlayHost}
        partyId={activePartyId}
        voiceEnabled={voiceEnabled}
        onVoiceEnabledChange={setVoiceEnabled}
      />
    </div>
  );
}

const appRootStyle: React.CSSProperties = {
  background: tokens.backgroundPrimary,
  minHeight: '100vh',
  color: tokens.textPrimary,
  overflow: 'hidden',
  position: 'relative'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 32px'
};

const genreBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  padding: '8px 32px 16px',
  overflowX: 'auto',
  msOverflowStyle: 'none',
  scrollbarWidth: 'none'
};

const genreButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: '1.5px solid ' + tokens.borderDefault,
  padding: '9px 18px',
  backgroundColor: 'rgba(15,18,26,0.4)',
  color: tokens.textSecondary,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontWeight: 500,
  transition: 'all 0.2s ease'
};

const genreButtonActiveStyle: React.CSSProperties = {
  ...genreButtonStyle,
  backgroundImage: 'linear-gradient(135deg, ' + tokens.accentMagenta + ', ' + tokens.accentCyan + ')',
  border: 'none',
  color: tokens.textPrimary,
  fontWeight: 600
};

const feedViewportStyle: React.CSSProperties = {
  position: 'relative',
  height: 'calc(100vh - 140px)',
  overflow: 'hidden',
  paddingTop: 8
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  height: '100%',
  position: 'relative',
  borderRadius: 24,
  overflow: 'hidden',
  boxShadow: '0 24px 60px rgba(0,0,0,0.35)'
};

const videoShellStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%'
};

const iframeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  borderRadius: 24,
  pointerEvents: 'none'
};

const engagementBarStyle: React.CSSProperties = {
  position: 'absolute',
  right: 20,
  bottom: '35%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 24,
  zIndex: 10
};

const engagementButtonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 0
};

const iconContainerStyle: React.CSSProperties = {
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '50%',
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.2s ease, background-color 0.2s ease'
};

const engagementIconStyle: React.CSSProperties = {
  fontSize: 28
};

const engagementCountStyle: React.CSSProperties = {
  color: tokens.textPrimary,
  fontSize: 13,
  fontWeight: 700,
  textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)'
};


const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '32px 24px 24px 24px',
  paddingRight: 100,
  background: 'linear-gradient(0deg, rgba(15,18,26,0.92) 0%, rgba(15,18,26,0.0) 100%)',
  paddingBottom: 32
};

const metadataStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12
};

const actionsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 999,
  border: 'none',
  backgroundImage: 'linear-gradient(135deg, ' + tokens.accentMagenta + ', ' + tokens.accentCyan + ')',
  color: tokens.textPrimary,
  fontWeight: 600,
  cursor: 'pointer'
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 999,
  border: '1px solid ' + tokens.textPrimary,
  backgroundColor: 'transparent',
  color: tokens.textPrimary,
  fontWeight: 600,
  cursor: 'pointer'
};

const genrePillStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'rgba(0,0,0,0.4)',
  padding: '6px 12px',
  borderRadius: 999,
  fontSize: 12,
  letterSpacing: 1
};

const authContainerStyle: React.CSSProperties = {
  background: tokens.backgroundPrimary,
  display: 'flex',
  minHeight: '100vh',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 24
};

const authCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  background: tokens.backgroundSecondary,
  borderRadius: 16,
  padding: 32,
  width: '100%',
  maxWidth: 420
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  color: tokens.textSecondary,
  fontSize: 14,
  gap: 6
};

const inputStyle: React.CSSProperties = {
  background: tokens.backgroundPrimary,
  color: tokens.textPrimary,
  border: '1px solid ' + tokens.borderDefault,
  borderRadius: 999,
  padding: '12px 16px'
};

const emptyStateStyle: React.CSSProperties = {
  position: 'absolute',
  top: '40%',
  left: '50%',
  transform: 'translate(-50%, -40%)',
  textAlign: 'center'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000
};

const reviewModalStyle: React.CSSProperties = {
  backgroundColor: tokens.backgroundSecondary,
  borderRadius: 16,
  padding: 32,
  width: '100%',
  maxWidth: 500,
  margin: 20
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20
};

const modalCloseButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: tokens.textSecondary,
  fontSize: 32,
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1
};

const reviewTextareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 120,
  backgroundColor: tokens.backgroundPrimary,
  color: tokens.textPrimary,
  border: '1px solid ' + tokens.borderDefault,
  borderRadius: 12,
  padding: 16,
  fontSize: 16,
  fontFamily: 'inherit',
  marginBottom: 20,
  resize: 'vertical'
};

const muteButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 20,
  right: 20,
  zIndex: 10,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  border: 'none',
  borderRadius: '50%',
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  backdropFilter: 'blur(4px)'
};
