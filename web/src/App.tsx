import { useEffect, useState } from 'react';
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

  const renderCard = (trailer: TrailerDoc) => {
    const iframeSrc = trailer.trailerUrl || (trailer.vimeoId ? 'https://player.vimeo.com/video/' + trailer.vimeoId + '?autoplay=0&title=0&byline=0&portrait=0' : '');
    const backgroundStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundImage: 'url(' + trailer.thumbnailUrl + ')',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };

    return (
      <article
        key={trailer.id}
        style={{
          backgroundColor: tokens.backgroundSecondary,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid ' + tokens.borderDefault
        }}
      >
        <div style={{ position: 'relative', paddingBottom: '56.25%', backgroundColor: '#000' }}>
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              allow="autoplay; fullscreen"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              title={trailer.title}
            />
          ) : (
            <div style={backgroundStyle} />
          )}
        </div>
        <div style={{ padding: 20 }}>
          <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: gradients[1] }}>{trailer.genre}</span>
          <h2 style={{ margin: '12px 0 8px' }}>{trailer.title}</h2>
          <p style={{ color: tokens.textSecondary }}>{trailer.synopsis}</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button
              style={primaryButtonStyle}
              onClick={() => window.open(trailer.fullContentUrl || iframeSrc, '_blank')}
            >
              Watch Full
            </button>
            <button style={secondaryButtonStyle} onClick={() => alert('Watchlist coming soon!')}>
              Save
            </button>
          </div>
        </div>
      </article>
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
    <div style={{ background: tokens.backgroundPrimary, color: tokens.textPrimary, minHeight: '100vh' }}>
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
      <main style={gridStyle}>
        {trailers.map(renderCard)}
      </main>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 32px'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 24,
  padding: '0 32px 48px'
};

const primaryButtonStyle: React.CSSProperties = {
  flex: '1 1 0%',
  padding: '12px 16px',
  borderRadius: 999,
  border: 'none',
  color: tokens.textPrimary,
  fontWeight: 600,
  backgroundImage: 'linear-gradient(135deg, ' + tokens.accentMagenta + ', ' + tokens.accentCyan + ')',
  cursor: 'pointer'
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: '1 1 0%',
  padding: '12px 16px',
  borderRadius: 999,
  border: '1px solid ' + tokens.textPrimary,
  background: 'transparent',
  color: tokens.textPrimary,
  fontWeight: 600,
  cursor: 'pointer'
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
