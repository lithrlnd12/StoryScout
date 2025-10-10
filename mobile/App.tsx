import { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, ImageBackground, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { subscribeToPublicContent, type TrailerDoc } from '../shared/firebase/firestore';
import tokens from '../shared/tokens/colors.json';
import trailers from '../shared/mocks/trailers.json';

type Trailer = TrailerDoc;
const fallbackFeed: TrailerDoc[] = trailers.map(item => ({
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

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [ready, setReady] = useState(false);
  const [feed, setFeed] = useState<TrailerDoc[]>(fallbackFeed);

  useEffect(() => {
    const prepare = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      setReady(true);
      SplashScreen.hideAsync().catch(() => undefined);
    };
    prepare();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPublicContent(items => {
      if (items.length) {
        setFeed(items);
      }
    }, error => {
      console.warn('Failed to load remote feed', error);
    });
    return unsubscribe;
  }, []);

  if (!ready) {
    return null;
  }

  const renderItem = ({ item }: { item: Trailer }) => (
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
          <TouchableOpacity style={styles.primaryCta}>
            <Text style={styles.primaryCtaText}>Watch Full</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCta}>
            <Text style={styles.secondaryCtaText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
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
    gap: 12
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
