import { getFirebaseAnalytics } from '@shared/firebase/client';
import { subscribeToPublicContent, type TrailerDoc } from '@shared/firebase/firestore';
import { useEffect, useState } from 'react';
import tokens from '@tokens/colors.json';
import mockData from '@mocks/trailers.json';

const gradients = tokens.accentGradient as string[];
const fallbackFeed: TrailerDoc[] = mockData.map(item => ({
  id: item.id,
  title: item.title,
  genre: item.genre,
  synopsis: item.synopsis,
  trailerUrl: item.trailerUrl,
  fullContentUrl: item.fullContentUrl,
  thumbnailUrl: item.thumbnailUrl,
  durationSeconds: item.durationSeconds ?? 0,
  likes: item.likes
}));

export default function App() {
  const [trailers, setTrailers] = useState<TrailerDoc[]>(fallbackFeed);

  useEffect(() => {
    getFirebaseAnalytics().catch(() => undefined);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPublicContent(items => {
      if (items.length) {
        setTrailers(items);
      }
    }, error => {
      console.warn('Failed to load remote feed', error);
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ background: tokens.backgroundPrimary, color: tokens.textPrimary, minHeight: '100vh' }}>
      <header style={{ padding: '24px 32px' }}>
        <h1 style={{ margin: 0 }}>Story Scout</h1>
        <p style={{ marginTop: 8, color: tokens.textSecondary }}>Trailer-first discovery across devices.</p>
      </header>
      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, padding: '0 32px 48px' }}>
        {trailers.map(trailer => (
          <article
            key={trailer.id}
            style={{
              backgroundColor: tokens.backgroundSecondary,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid ' + tokens.borderDefault
            }}
          >
            <div
              style={{
                position: 'relative',
                paddingBottom: '56.25%',
                backgroundImage: 'url(' + trailer.thumbnailUrl + ')',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <div style={{ padding: 20 }}>
              <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: gradients[1] }}>{trailer.genre}</span>
              <h2 style={{ margin: '12px 0 8px' }}>{trailer.title}</h2>
              <p style={{ color: tokens.textSecondary }}>{trailer.synopsis}</p>
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <button style={primaryButtonStyle}>Watch Full</button>
                <button style={secondaryButtonStyle}>Save ({trailer.likes ?? 0})</button>
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}

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
