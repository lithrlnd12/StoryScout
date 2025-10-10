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
  Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import tokens from '../shared/tokens/colors.json';
import trailers from '../shared/mocks/trailers.json';
import { subscribeToPublicContent, type TrailerDoc } from '../shared/firebase/firestore';
import {
  subscribeToAuthChanges,
  signInWithEmail,
  signUpWithEmail,
  signOutFirebase,
  type User
} from '../shared/firebase/auth';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const fallbackFeed: TrailerDoc[] = trailers.map(item => ({
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
    let unsubscribe: (() => void) | undefined;
    subscribeToAuthChanges(current => {
      setUser(current);
    }).then(unsub => {
      unsubscribe = unsub;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
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
      trailer.vimeoCategories?.forEach(category => set.add(category));
    });
    return ['All', ...Array.from(set)];
  }, [feed]);

  const filteredFeed = useMemo(() => {
    if (selectedGenre === 'All') {
      return feed;
    }
    const target = selectedGenre.toLowerCase();
    return feed.filter(trailer => {
      if (trailer.genre?.toLowerCase() === target) return true;
      return trailer.vimeoCategories?.some(category => category.toLowerCase() === target);
    });
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

  const handleWatchFull = (url: string) => {
    if (!url) {
      return;
    }
    Linking.openURL(url).catch(() => undefined);
  };

  const handleSave = () => {
    // Placeholder for future watchlist functionality
  };

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

  const renderItem = ({ item }: { item: TrailerDoc }) => (
    <View style={styles.cardContainer}>
      <ImageBackground source={{ uri: item.thumbnailUrl }} style={styles.thumbnail}>
        <View style={styles.videoOverlay}>
          <Text style={styles.genre}>{item.genre}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.synopsis}>{item.synopsis}</Text>
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.primaryCta} onPress={() => handleWatchFull(item.fullContentUrl || item.trailerUrl)}>
              <Text style={styles.primaryCtaText}>Watch Full</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCta} onPress={handleSave}>
              <Text style={styles.secondaryCtaText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );

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
    paddingBottom: 16,
    columnGap: 12
  },
  genrePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.borderDefault,
    paddingVertical: 6,
    paddingHorizontal: 16
  },
  genrePillActive: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: tokens.accentMagenta
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
    justifyContent: 'flex-end'
  },
  thumbnail: {
    height: ITEM_HEIGHT,
    justifyContent: 'flex-end'
  },
  videoOverlay: {
    padding: 24,
    backgroundColor: 'rgba(15,18,26,0.45)'
  },
  genre: {
    color: tokens.accentCyan,
    marginBottom: 8,
    fontWeight: '600'
  },
  title: {
    color: tokens.textPrimary,
    fontSize: 28,
    fontWeight: '700'
  },
  synopsis: {
    color: tokens.textSecondary,
    marginTop: 12,
    marginBottom: 24
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
  }
});
