import React from 'react';
import { FlatList, View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

export type MovieListItem = {
  id: number | string;
  title: string;
  releaseYear?: number;
  genres?: string[];
  rating?: number;
  runtime?: string;
  advisory?: string;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  badges?: string[];
  overview?: string;
  tmdbId?: string;
  imdbId?: string;
  watched?: boolean;
  favorite?: boolean;
};

interface MovieListProps {
  movies: MovieListItem[];
  onSelect?: (movie: MovieListItem) => void;
  onToggleFavorite?: (movie: MovieListItem) => void;
}

export const MovieList: React.FC<MovieListProps> = ({ movies, onSelect, onToggleFavorite }) => {
  const colors = useColors();

  const renderItem = ({ item }: { item: MovieListItem }) => (
    <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => onSelect?.(item)}>
      <Image
        source={{ uri: item.posterUrl }}
        style={styles.poster}
        contentFit="cover"
        cachePolicy="disk"
      />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title} {item.releaseYear ? `(${item.releaseYear})` : ''}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}> 
          {item.genres?.join(', ')}
          {item.rating ? ` · ⭐ ${item.rating}` : ''}
          {item.runtime ? ` · ${item.runtime}` : ''}
          {item.advisory ? ` · ${item.advisory}` : ''}
        </Text>
        <Text style={[styles.overview, { color: colors.textTertiary }]} numberOfLines={2}>
          {item.overview}
        </Text>
        <View style={styles.badgesRow}>
          {item.badges?.map(badge => (
            <View key={badge} style={[styles.badge, { backgroundColor: colors.primaryGlow }]}> 
              <Text style={[styles.badgeText, { color: colors.textInverse }]}>{badge}</Text>
            </View>
          ))}
        </View>
      </View>
      <Pressable
        style={styles.favoriteBtn}
        onPress={() => onToggleFavorite?.(item)}
        accessibilityLabel={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
        accessibilityRole="button"
      >
        <Ionicons
          name={item.favorite ? 'heart' : 'heart-outline'}
          size={22}
          color={item.favorite ? colors.accent : colors.textTertiary}
        />
      </Pressable>
    </Pressable>
  );

  return (
    <FlatList
      data={movies}
      renderItem={renderItem}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  poster: {
    width: 72,
    height: 108,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#222',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    marginBottom: 2,
  },
  overview: {
    fontSize: 12,
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  favoriteBtn: {
    marginLeft: 8,
    alignSelf: 'flex-start',
    padding: 6,
  },
});

export default MovieList;
