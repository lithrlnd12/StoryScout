
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFirebaseAnalytics } from '@shared/firebase/client';
import { subscribeToPublicContent, type TrailerDoc } from '@shared/firebase/firestore';
import {
  subscribeToAuthChanges,
  signInWithEmail,
  signUpWithEmail,
  signOutFirebase,
  type User
} from '@shared/firebase/auth';
import tokens from '@tokens/colors.json';
import mockData from '@mocks/trailers.json';

const gradients = tokens.accentGradient as string[];
const fallbackFeed: TrailerDoc[] = mockData.map(item => ({
  id: item.id,
  title: item.title,
  genre: item.genre,
  synopsis: item.synopsis,
  trailerUrl: item.trailerUrl ?? '',
  fullContentUrl: item.fullContentUrl ?? '',
  thumbnailUrl: item.thumbnailUrl ?? '',
  durationSeconds: item.durationSeconds ?? 0,
  likes: item.likes ?? 0,
  vimeoId: item.vimeoId,
  vimeoCategories: item.vimeoCategories
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getFirebaseAnalytics().catch(() => undefined);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    subscribeToAuthChanges(current => {
      setUser(current);
    }).then(unsub => {
      unsubscribe = unsub;
    });
    return () => unsubscribe?.();
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
      trailer.vimeoCategories?.forEach(category => set.add(category));
    });
    return ['All', ...Array.from(set)];
  }, [trailers]);

  const filteredTrailers = useMemo(() => {
    if (selectedGenre === 'All') {
      return trailers;
    }
    const target = selectedGenre.toLowerCase();
    return trailers.filter(trailer => {
      if (trailer.genre?.toLowerCase() === target) return true;
      return trailer.vimeoCategories?.some(category => category.toLowerCase() === target);
    });
  }, [trailers, selectedGenre]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedGenre, filteredTrailers.length]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(filteredTrailers.length - 1, nextIndex));
      if (clamped === currentIndex) return;
      setTransitioning(true);
      setCurrentIndex(clamped);
      setTimeout(() => setTransitioning(false), 400);
    },
    [currentIndex, filteredTrailers.length]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
      if (transitioning) return;
      if (event.deltaY > 40) {
        event.preventDefault();
        goToIndex(currentIndex + 1);
      } else if (event.deltaY < -40) {
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

    el.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKey);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKey);
    };
  }, [currentIndex, transitioning, filteredTrailers.length, goToIndex]);

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

  const renderCard = (trailer: TrailerDoc, index: number) => {
    const isActive = index === currentIndex;
    const autoplay = isActive ? '1' : '0';
    const iframeSrc = trailer.trailerUrl || (
      trailer.vimeoId
        ? 'https://player.vimeo.com/video/' + trailer.vimeoId + '?autoplay=' + autoplay + '&muted=0&title=0&byline=0&portrait=0'
        : ''
    );
    const transform = 'translateY(' + (index - currentIndex) * 100 + 'vh)';

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
          transition: 'transform 0.35s ease-out',
          transform
        }}
      >
        <div style={cardStyle}>
          <div style={videoShellStyle}>
            {iframeSrc ? (
              <iframe
                src={iframeSrc}
                allow="autoplay; fullscreen"
                style={iframeStyle}
                title={trailer.title}
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
            <div style={overlayStyle}>
              <div style={metadataStyle}>
                <span style={genrePillStyle}>{trailer.genre}</span>
                <h2 style={{ margin: '16px 0 8px' }}>{trailer.title}</h2>
                <p style={{ color: tokens.textSecondary, maxWidth: 480 }}>{trailer.synopsis}</p>
                <div style={actionsRowStyle}>
                  <button style={primaryButtonStyle} onClick={() => window.open(trailer.fullContentUrl || iframeSrc, '_blank')}>
                    Watch Full
                  </button>
                  <button style={secondaryButtonStyle} onClick={() => alert('Watchlist coming soon!')}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

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
            <p style={{ color: tokens.textSecondary }}>We’re busy scouting more stories for this genre.</p>
          </div>
        )}
      </div>
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
  gap: 12,
  padding: '0 32px 16px',
  overflowX: 'auto'
};

const genreButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: '1px solid ' + tokens.borderDefault,
  padding: '8px 16px',
  background: 'transparent',
  color: tokens.textSecondary,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const genreButtonActiveStyle: React.CSSProperties = {
  ...genreButtonStyle,
  backgroundImage: 'linear-gradient(135deg, ' + tokens.accentMagenta + ', ' + tokens.accentCyan + ')',
  border: 'none',
  color: tokens.textPrimary
};

const feedViewportStyle: React.CSSProperties = {
  position: 'relative',
  height: 'calc(100vh - 160px)',
  overflow: 'hidden'
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
  borderRadius: 24
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: 24,
  background: 'linear-gradient(0deg, rgba(15,18,26,0.85) 0%, rgba(15,18,26,0.0) 65%)'
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
  background: 'transparent',
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
