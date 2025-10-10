import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
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

type AuthMode = 'signin' | 'signup';

export default function App() {
  const [ready, setReady] = useState(false);
  const [feed, setFeed] = useState<TrailerDoc[]>(fallbackFeed);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

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
      Alert.alert('Unavailable', 'Full content is not yet available.');
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open video.'));
  };

  const handleSave = () => {
    Alert.alert('Coming Soon', 'Watchlist functionality will arrive in the next build.');
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
    <ImageBackground
      source={{ uri: item.thumbnailUrl }}
      style={styles.trailerCard}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.genre}>{item.genre}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.synopsis}>{item.synopsis}</Text>
        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.primaryCta} onPress={() => handleWatchFull(item.fullContentUrl)}>
            <Text style={styles.primaryCtaText}>Watch Full</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCta} onPress={handleSave}>
            <Text style={styles.secondaryCtaText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
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
      <FlatList
        data={feed}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
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
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginBottom: 12
  },
  errorText: {
    color: tokens.error,
    textAlign: 'center',
    marginBottom: 12
  },
  header: {
    padding: 16,
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
  trailerCard: {
    height: '100%',
    justifyContent: 'flex-end'
  },
  overlay: {
    backgroundColor: 'rgba(15, 18, 26, 0.65)',
    padding: 24
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
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
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
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryCtaText: {
    color: tokens.textPrimary,
    fontWeight: '600'
  },
  authToggle: {
    marginTop: 16,
    alignItems: 'center'
  },
  authToggleText: {
    color: tokens.textSecondary
  }
});
