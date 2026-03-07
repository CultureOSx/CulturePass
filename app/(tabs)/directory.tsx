import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CultureTokens } from '@/constants/theme';
import { useState, useMemo, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile } from '@/shared/schema';
import { FilterChipRow, FilterItem } from '@/components/FilterChip';
import { useColors } from '@/hooks/useColors';
import { useLayout } from '@/hooks/useLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';


// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  business:     CultureTokens.gold,
  venue:        CultureTokens.teal,
  council:      CultureTokens.indigo,
  government:   CultureTokens.coral,
  organisation: CultureTokens.saffron,
};

const TYPE_ICONS: Record<string, string> = {
  business: 'storefront',
  venue: 'location',
  council: 'shield-checkmark',
  government: 'flag',
  organisation: 'business',
};

const ENTITY_FILTERS = [
  { label: 'All',          icon: 'grid',             color: CultureTokens.indigo,   display: 'All' },
  { label: 'business',     icon: 'storefront',        color: CultureTokens.gold,     display: 'Businesses' },
  { label: 'venue',        icon: 'location',          color: CultureTokens.teal,     display: 'Venues' },
  { label: 'organisation', icon: 'business',          color: CultureTokens.saffron,  display: 'Organisations' },
  { label: 'council',      icon: 'shield-checkmark',  color: CultureTokens.indigo,   display: 'Councils' },
  { label: 'government',   icon: 'flag',              color: CultureTokens.coral,    display: 'Government' },
] as const;

function getOptionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return num.toString();
}

function getTags(profile: Profile): string[] {
  return Array.isArray(profile.tags) ? (profile.tags as string[]) : [];
}

// ─── DirectoryCard ────────────────────────────────────────────────────────────

function DirectoryCard({ profile, colors }: { profile: Profile; colors: ReturnType<typeof useColors> }) {
  const color = TYPE_COLORS[profile.entityType] ?? colors.primary;
  const icon = TYPE_ICONS[profile.entityType] ?? 'business';
  const tags = getTags(profile);
  const profileRecord = profile as unknown as Record<string, unknown>;
  const phone = getOptionalString(profileRecord, 'phone');
  const address = getOptionalString(profileRecord, 'address');

  const handlePress = () => {
    if (profile.entityType === 'community') {
      router.push({ pathname: '/community/[id]', params: { id: profile.id } });
    } else {
      router.push({ pathname: '/profile/[id]', params: { id: profile.id } });
    }
  };

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${profile.name}, ${profile.entityType}${profile.city ? `, ${profile.city}` : ''}`}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.businessIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as never} size={26} color={color} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
              {profile.name}
            </Text>
            {profile.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
            )}
          </View>
          <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>
            {profile.category ?? profile.entityType}
          </Text>
          {profile.culturePassId ? (
            <Text style={[styles.cpidLabel, { color: colors.textTertiary }]}>{profile.culturePassId}</Text>
          ) : null}
        </View>

        {profile.rating != null ? (
          <View style={[styles.ratingBadge, { backgroundColor: colors.accent + '18' }]}>
            <Ionicons name="star" size={14} color={colors.accent} />
            <Text style={[styles.ratingText, { color: colors.accent }]}>{profile.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      {/* Description */}
      {profile.description ? (
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {profile.description}
        </Text>
      ) : null}

      {tags.length > 0 && (
        <View style={styles.serviceRow}>
          {tags.slice(0, 3).map(tag => (
            <View key={tag} style={[styles.servicePill, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.serviceText, { color: colors.textSecondary }]}>{tag}</Text>
            </View>
          ))}
          {tags.length > 3 && (
            <Text style={[styles.moreServices, { color: colors.primary }]}>+{tags.length - 3}</Text>
          )}
        </View>
      )}

      {(phone || address) && (
        <View style={styles.quickActions}>
          {phone ? (
            <View style={[styles.quickActionCircle, { backgroundColor: colors.secondary + '15' }]}>
              <Ionicons name="call" size={18} color={colors.secondary} />
            </View>
          ) : null}
          {address ? (
            <View style={[styles.quickActionCircle, { backgroundColor: colors.info + '15' }]}>
              <Ionicons name="location" size={18} color={colors.info} />
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.cardFooter}>
        {profile.city ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {profile.city}
              {profile.country ? `, ${profile.country}` : ''}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.statsRow}>
          <Text style={[styles.followersText, { color: colors.secondary }]}>
            {formatNumber(profile.followersCount ?? 0)} followers
          </Text>
          {(profile.reviewsCount ?? 0) > 0 && (
            <Text style={[styles.reviewCount, { color: colors.textTertiary }]}>{profile.reviewsCount} reviews</Text>
          )}
        </View>
      </View>

      {/* CTA */}
      <Pressable
        style={[styles.cardAction, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '20' }]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${profile.name}`}
      >
        <Text style={[styles.cardActionText, { color: colors.primary }]}>View Details</Text>
        <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
      </Pressable>
    </Pressable>
  );
}

// ─── DirectoryScreen ──────────────────────────────────────────────────────────

export default function DirectoryScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const colors = useColors();
  const { hPad, isDesktop } = useLayout();
  const [selectedType, setSelectedType] = useState('All');
  const [search, setSearch] = useState('');

  const { data: allProfiles, isLoading, error: profilesError, refetch: refetchProfiles } = useQuery<Profile[]>({
    queryKey: ['/api/profiles'],
    queryFn: () => api.profiles.list(),
  });

  // Exclude community profiles — this screen is for directory listings only
  const nonCommunityProfiles = useMemo(
    () => (allProfiles ?? []).filter(p => p.entityType !== 'community'),
    [allProfiles],
  );

  const filtered = useMemo(() => {
    let results = nonCommunityProfiles;

    if (selectedType !== 'All') {
      results = results.filter(p => p.entityType === selectedType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(p => {
        const tags = getTags(p);
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q) ||
          tags.some(t => t.toLowerCase().includes(q))
        );
      });
    }

    return results;
  }, [selectedType, search, nonCommunityProfiles]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: nonCommunityProfiles.length };
    for (const p of nonCommunityProfiles) {
      counts[p.entityType] = (counts[p.entityType] ?? 0) + 1;
    }
    return counts;
  }, [nonCommunityProfiles]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchProfiles();
    } finally {
      setRefreshing(false);
    }
  }, [refetchProfiles]);

  const handleFilterSelect = useCallback((id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(id);
  }, []);

  const filterItems = useMemo<FilterItem[]>(() => {
    return ENTITY_FILTERS.map(filter => ({
      id: filter.label,
      label: filter.display,
      icon: filter.icon,
      color: filter.color,
      count: typeCounts[filter.label],
    }));
  }, [typeCounts]);

  if (profilesError) {
    return (
      <ErrorBoundary>
        <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Could not load directory</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Check your connection and try again</Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetchProfiles()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading directory"
          >
            <Text style={[styles.retryBtnText, { color: colors.textInverse }]}>Try Again</Text>
          </Pressable>
        </View>
      </ErrorBoundary>
    );
  }

  const listPad = isDesktop ? hPad : 20;

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: listPad }]}>
          <Text style={[styles.title, { color: colors.text }]}>Directory</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Businesses, venues, organisations & more</Text>
        </View>

        {/* Search bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.borderLight, marginHorizontal: listPad }]}>
          <Ionicons name="search" size={22} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search directory..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Category filter chips */}
        <View style={styles.categorySection}>
          <FilterChipRow items={filterItems} selectedId={selectedType} onSelect={handleFilterSelect} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.list, { paddingHorizontal: listPad }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          >
            <Text style={[styles.resultCount, { color: colors.text }]}>
              {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'} found
            </Text>

            {filtered.map((profile) => (
              <DirectoryCard key={profile.id} profile={profile} colors={colors} />
            ))}

            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={52} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Try a different filter or search term
                </Text>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </ErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontFamily: 'Poppins_700Bold' },
  subtitle: { fontSize: 14, fontFamily: 'Poppins_400Regular', marginTop: 2, marginBottom: 4 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 0.5,
    marginBottom: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    padding: 0,
    minWidth: 0,
  },
  categorySection: { paddingTop: 8, paddingBottom: 4 },
  resultCount: { fontSize: 15, fontFamily: 'Poppins_700Bold', marginBottom: 12 },
  list: { paddingTop: 6 },
  card: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 0.5,
    gap: 12,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  businessIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardName: { fontSize: 17, fontFamily: 'Poppins_700Bold', flexShrink: 1 },
  cardCategory: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  cpidLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, letterSpacing: 0.8, marginTop: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  ratingText: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  cardDesc: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 21 },
  serviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  servicePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  serviceText: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  moreServices: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  quickActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickActionCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  followersText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  reviewCount: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  cardAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, marginTop: 6, borderRadius: 14, borderWidth: 1 },
  cardActionText: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 14 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', marginTop: 4 },
  emptySubtext: { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
});