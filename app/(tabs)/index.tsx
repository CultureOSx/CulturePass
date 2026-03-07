import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  useColorScheme,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/lib/auth';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import type { PaginatedEventsResponse, EventData, Community } from '@/shared/schema';
import { useMemo, useCallback, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LocationPicker } from '@/components/LocationPicker';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { api, type ActivityData } from '@/lib/api';
import { useColors } from '@/hooks/useColors';
import EventCard from '@/components/Discover/EventCard';
import CategoryCard from '@/components/Discover/CategoryCard';
import CommunityCard from '@/components/Discover/CommunityCard';
import CityCard from '@/components/Discover/CityCard';
import { CultureTokens, CategoryColors, gradients } from '@/constants/theme';
import { FilterChip } from '@/components/FilterChip';
import SectionHeader from '@/components/Discover/SectionHeader';
import SpotlightCard, { SpotlightItem } from '@/components/Discover/SpotlightCard';
import WebRailSection from '@/components/Discover/WebRailSection';
import WebHeroCarousel from '@/components/Discover/WebHeroCarousel';
import { calculateDistance, getPostcodesByPlace } from '@/shared/location/australian-postcodes';
import { useCouncil } from '@/hooks/useCouncil';
import { useLayout } from '@/hooks/useLayout';

const isWeb = Platform.OS === 'web';

const superAppSections = [
  { id: 'movies',      label: 'Movies',     icon: 'film',        color: CultureTokens.coral,     route: '/movies' },
  { id: 'restaurants', label: 'Dining',     icon: 'restaurant',  color: CultureTokens.saffron,   route: '/restaurants' },
  { id: 'activities',  label: 'Activities', icon: 'compass',     color: CultureTokens.teal,      route: '/activities' },
  { id: 'shopping',    label: 'Shopping',   icon: 'bag-handle',  color: CategoryColors.shopping, route: '/shopping' },
  { id: 'events',      label: 'Events',     icon: 'calendar',    color: CultureTokens.indigo,    route: '/(tabs)/explore' },
  { id: 'directory',   label: 'Directory',  icon: 'storefront',  color: CultureTokens.teal,      route: '/(tabs)/directory' },
];

const SECTION_ROUTES: Record<string, string> = {
  movies: '/movies',
  restaurants: '/restaurants',
  activities: '/activities',
  shopping: '/shopping',
  events: '/(tabs)/explore',
  directory: '/(tabs)/directory',
};

const browseCategories = [
  { id: 'c1',  label: 'Music',               icon: 'musical-notes',  color: CategoryColors.music },
  { id: 'c2',  label: 'Dance',               icon: 'body',           color: CategoryColors.dance },
  { id: 'c3',  label: 'Food',                icon: 'restaurant',     color: CategoryColors.food },
  { id: 'c4',  label: 'Art',                 icon: 'color-palette',  color: CategoryColors.art },
  { id: 'c5',  label: 'Wellness',            icon: 'heart',          color: CategoryColors.wellness },
  { id: 'c6',  label: 'Movies',              icon: 'film',           color: CategoryColors.movies },
  { id: 'c7',  label: 'Workshop',            icon: 'construct',      color: CategoryColors.workshop },
  { id: 'c8',  label: 'Heritage',            icon: 'library',        color: CategoryColors.heritage },
  { id: 'c9',  label: 'Activities & Play',   icon: 'game-controller',color: CategoryColors.activities },
  { id: 'c10', label: 'Nightlife',           icon: 'moon',           color: CategoryColors.nightlife },
  { id: 'c11', label: 'Comedy',              icon: 'happy',          color: CategoryColors.comedy },
  { id: 'c12', label: 'Sports',              icon: 'football',       color: CategoryColors.sports },
  { id: 'c13', label: 'Monuments',           icon: 'build',          color: CategoryColors.monuments },
  { id: 'c14', label: 'Featured Artists',    icon: 'star',           color: CategoryColors.artists },
];

const WEB_CATEGORIES = ['All', 'Music', 'Dance', 'Food', 'Art', 'Wellness', 'Movies', 'Workshop', 'Heritage', 'Activities & Play', 'Nightlife', 'Comedy', 'Sports', 'Historical Monuments', 'Featured Artists'];

const FEATURED_CITIES = [
  { name: 'Sydney',     country: 'Australia' },
  { name: 'Melbourne',  country: 'Australia' },
  { name: 'Brisbane',   country: 'Australia' },
  { name: 'Perth',      country: 'Australia' },
  { name: 'Adelaide',   country: 'Australia' },
  { name: 'Gold Coast', country: 'Australia' },
  { name: 'Canberra',   country: 'Australia' },
  { name: 'Darwin',     country: 'Australia' },
];

function pushSafe(route?: string) {
  if (!route) return;
  router.push(route as never);
}

interface DiscoverSection {
  title: string;
  subtitle?: string;
  type: 'events' | 'communities' | 'businesses' | 'activities' | 'spotlight' | 'mixed';
  items: Record<string, unknown>[];
  priority: number;
}

interface DiscoverFeed {
  sections: DiscoverSection[];
  meta: {
    userId: string;
    city: string;
    country: string;
    generatedAt: string;
    totalItems: number;
  };
}

interface TraditionalLand {
  id: string;
  city: string;
  landName: string;
  traditionalCustodians: string;
}

interface CultureCard {
  id: string;
  label: string;
  color: string;
  emoji?: string;
  icon: string;
}

function eventToTimestamp(event: EventData): number {
  const [year, month, day] = (event.date ?? '').split('-').map(Number);
  if (!year || !month || !day) return Number.POSITIVE_INFINITY;
  return new Date(year, month - 1, day).getTime();
}

function cityToCoordinates(city?: string): { latitude: number; longitude: number } | null {
  if (!city) return null;
  const match = getPostcodesByPlace(city)[0];
  if (!match) return null;
  return { latitude: match.latitude, longitude: match.longitude };
}

export default function HomeScreen() {
  const insets   = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const colors   = useColors();
  const s        = getStyles(colors);
  const { width, isDesktop, isTablet } = useLayout();
  const scheme   = useColorScheme();
  const isDark   = scheme === 'dark';
  const { state } = useOnboarding();
  const { isAuthenticated, userId: authUserId, user: authUser } = useAuth();
  const pathname = usePathname();
  const { data: councilData } = useCouncil();
  const council = councilData?.council;

  const { data: eventsResponse } = useQuery<PaginatedEventsResponse>({
    queryKey: ['/api/events'],
    queryFn: () => api.events.list({ pageSize: 100 }),
  });
  const allEvents = useMemo<EventData[]>(() => eventsResponse?.events ?? [], [eventsResponse]);
  const activeAlerts   = (councilData?.alerts ?? []).filter((a: { status: string }) => a.status === 'active');
  const isCouncilVerified = council?.verificationStatus === 'verified';
  const lgaCode = council?.lgaCode;

  const councilEvents = useMemo(() => {
    if (!council || !allEvents.length) return [];
    return allEvents.filter((e: EventData) =>
      (e.lgaCode && council.lgaCode && e.lgaCode === council.lgaCode) ||
      (e.councilId && council.id && e.councilId === council.id)
    );
  }, [council, allEvents]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const headerBorderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP),
  }));
  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP),
  }));

  const { data: traditionalLandsData = [] } = useQuery<TraditionalLand[]>({
    queryKey: ['/api/indigenous/traditional-lands'],
    queryFn: () => api.raw('GET', 'api/indigenous/traditional-lands'),
  });

  const { data: allEventsFiltered = [] } = useQuery<EventData[]>({
    queryKey: ['/api/events', state.country, state.city],
    queryFn: async () => {
      const result = await api.events.list({
        country: state.country || undefined,
        city:    state.city    || undefined,
        pageSize: 50,
      });
      return result.events ?? [];
    },
  });

  const { data: allCommunities = [] } = useQuery<Community[]>({
    queryKey: ['/api/communities', state.city, state.country],
    queryFn: () => api.communities.list({
      city:    state.city    || undefined,
      country: state.country || undefined,
    }),
  });

  const { data: allActivities = [] } = useQuery<ActivityData[]>({
    queryKey: ['/api/activities', state.country, state.city],
    queryFn: () => api.activities.list({
      country: state.country || undefined,
      city:    state.city    || undefined,
    }),
  });

  const { data: spotlights = [] } = useQuery<SpotlightItem[]>({
    queryKey: ['/api/indigenous/spotlights'],
    queryFn: () => api.raw('GET', 'api/indigenous/spotlights'),
  });

  const { data: discoverFeed, isLoading: discoverLoading, refetch } = useQuery<DiscoverFeed>({
    queryKey: ['/api/discover', authUserId ?? 'guest', state.city, state.country],
    queryFn: async () => {
      if (authUserId) {
        const qs = new URLSearchParams();
        if (state.city)    qs.set('city',    state.city);
        if (state.country) qs.set('country', state.country);
        const q = qs.toString();
        return api.raw('GET', `api/discover/${authUserId}${q ? `?${q}` : ''}`);
      }
      return { sections: [], meta: { userId: 'guest', city: state.city ?? '', country: state.country ?? '', generatedAt: new Date().toISOString(), totalItems: 0 } };
    },
  });

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = useMemo(() => {
    if (!isAuthenticated) return 'Explorer';
    const name = authUser?.displayName ?? authUser?.username ?? '';
    return name.split(' ')[0] || 'Explorer';
  }, [isAuthenticated, authUser]);

  const sections     = discoverFeed?.sections ?? [];
  const nearYou      = sections.find(s => s.title === 'Near You');
  const otherSections = sections.filter(s => s.title !== 'Near You');

  const selectedCityCoords = useMemo(() => cityToCoordinates(state.city), [state.city]);

  const distanceSortedEvents = useMemo(() => {
    if (!selectedCityCoords) return [] as EventData[];
    return allEventsFiltered
      .filter((e: EventData) => Boolean(e.venue && e.city))
      .map((e: EventData) => {
        const c = cityToCoordinates(e.city);
        if (!c) return null;
        return { event: e, distanceKm: calculateDistance(selectedCityCoords.latitude, selectedCityCoords.longitude, c.latitude, c.longitude) };
      })
      .filter((x): x is { event: EventData; distanceKm: number } => Boolean(x))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12)
      .map(x => ({ ...x.event, distanceKm: x.distanceKm }));
  }, [allEventsFiltered, selectedCityCoords]);

  const popularEvents = useMemo(() => {
    if (nearYou?.items?.length) {
      const res: Record<string, unknown>[] = [];
      for (const item of nearYou.items) {
        if (item.venue) { res.push(item); if (res.length === 12) break; }
      }
      return res;
    }
    if (distanceSortedEvents.length > 0) return distanceSortedEvents;
    const res: EventData[] = [];
    for (const e of allEventsFiltered) {
      if (!e.venue) continue;
      const attending = e.attending || 0;
      if (res.length === 12 && attending <= (res[11].attending || 0)) continue;
      let inserted = false;
      for (let j = 0; j < res.length; j++) {
        if (attending > (res[j].attending || 0)) {
          res.splice(j, 0, e);
          if (res.length > 12) res.pop();
          inserted = true;
          break;
        }
      }
      if (!inserted && res.length < 12) res.push(e);
    }
    return res;
  }, [nearYou, allEventsFiltered, distanceSortedEvents]);

  const featuredEvent = allEventsFiltered.find(e => e.isFeatured) || allEventsFiltered[0];

  const cultureCards = useMemo<CultureCard[]>(() => {
    const types: Record<string, CultureCard[]> = {};
    allCommunities.forEach((c) => {
      const key = c.type || 'other';
      if (!types[key]) types[key] = [];
      if (types[key].length < 8) {
        types[key].push({ id: c.id, label: c.name?.split(' ')[0] || c.name || 'Community', color: CultureTokens.indigo, emoji: c.iconEmoji, icon: 'people' });
      }
    });
    return Object.values(types).flat().slice(0, 10);
  }, [allCommunities]);

  const isCompactWeb   = isWeb && width < 1100;
  const contentMaxWidth = isWeb ? (isDesktop ? 1360 : isTablet ? 1120 : 980) : width;
  const maxWidth = isWeb ? Math.min(width - (isDesktop ? 48 : 24), contentMaxWidth) : width;
  const cityColumns  = isWeb ? (isDesktop ? 4 : isTablet ? 3 : 2) : 2;
  const cityCardWidth = Math.max(140, (maxWidth - 40 - 14 * (cityColumns - 1)) / cityColumns);

  const [refreshing, setRefreshing] = useState(false);
  const [webSearch, setWebSearch]   = useState('');
  const [webCategoryFilter, setWebCategoryFilter] = useState('All');

  const signInRoute = useMemo(() => {
    const redirectTo = pathname && pathname.startsWith('/') ? pathname : '/(tabs)';
    return `/(onboarding)/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  }, [pathname]);

  const openNotifications = useCallback(() => {
    if (isAuthenticated) {
      router.push('/notifications');
    } else {
      router.push('/(onboarding)/login?redirectTo=%2Fnotifications' as never);
    }
  }, [isAuthenticated]);

  const categoryFilteredEvents = useCallback((evts: EventData[]) => {
    if (webCategoryFilter === 'All') return evts;
    return evts.filter((event) => {
      const bucket = `${event.category ?? ''} ${event.communityTag ?? ''} ${(event.tags ?? []).join(' ')} ${event.title}`.toLowerCase();
      return bucket.includes(webCategoryFilter.toLowerCase());
    });
  }, [webCategoryFilter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const land = traditionalLandsData.find((l) => l.city === state.city);

  const searchableEvents = useMemo(
    () => allEventsFiltered.filter((e) => Boolean(e.imageUrl && e.venue)),
    [allEventsFiltered],
  );
  const filterEventsForWeb = useCallback((events: EventData[]) => {
    const term = webSearch.trim().toLowerCase();
    if (!term) return events;
    return events.filter((e) => {
      const bucket = `${e.title} ${e.venue ?? ''} ${e.communityTag ?? ''} ${e.city ?? ''}`.toLowerCase();
      return bucket.includes(term);
    });
  }, [webSearch]);

  const webFeatured = useMemo(
    () => filterEventsForWeb([...searchableEvents].sort((a, b) => (b.attending ?? 0) - (a.attending ?? 0)).slice(0, 12)),
    [searchableEvents, filterEventsForWeb],
  );
  const webActivities = useMemo(
    () => allActivities.filter(a => a.status !== 'archived').slice().sort((a, b) => (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0)).slice(0, 12)
      .map(a => ({
        id: a.id, title: a.name, description: a.description, category: a.category, communityTag: a.category,
        date: a.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10), time: '18:00',
        venue: a.location || a.city, city: a.city, country: a.country, imageUrl: a.imageUrl || '',
        priceLabel: a.priceLabel || 'Free', isFeatured: a.isPromoted, isPromoted: a.isPromoted,
      } as EventData)),
    [allActivities],
  );
  const webArtists = useMemo(
    () => filterEventsForWeb(searchableEvents.filter((e) => {
      const tag = `${e.organizerId ?? ''} ${e.title}`.toLowerCase();
      return tag.includes('dj') || tag.includes('artist') || tag.includes('band') || tag.includes('live');
    }).slice(0, 12)),
    [searchableEvents, filterEventsForWeb],
  );
  const webUpcoming = useMemo(
    () => filterEventsForWeb([...searchableEvents].sort((a, b) => eventToTimestamp(a) - eventToTimestamp(b)).slice(0, 12)),
    [searchableEvents, filterEventsForWeb],
  );
  const webHeroEvents = useMemo(
    () => (webFeatured.length > 0 ? webFeatured : searchableEvents).slice(0, 6),
    [webFeatured, searchableEvents],
  );
  const webForYou = useMemo(() => {
    const interests = state.interests ?? [];
    if (!interests.length) return filterEventsForWeb(webFeatured.slice(0, 12));
    const matched = filterEventsForWeb(
      searchableEvents.filter((e) => {
        const bucket = `${e.category ?? ''} ${e.communityTag ?? ''} ${e.title} ${e.tags?.join(' ') ?? ''}`.toLowerCase();
        return interests.some((i) => bucket.includes(i.toLowerCase()));
      }),
    ).slice(0, 12);
    return matched.length >= 3 ? matched : filterEventsForWeb(webFeatured.slice(0, 12));
  }, [searchableEvents, state.interests, filterEventsForWeb, webFeatured]);
  const webNearYou = useMemo(() => {
    if (!state.city) return [];
    return filterEventsForWeb(
      searchableEvents.filter((e) => (e.city ?? '').toLowerCase() === state.city.toLowerCase()),
    ).slice(0, 12);
  }, [searchableEvents, state.city, filterEventsForWeb]);

  // ── Web early return ──────────────────────────────────────────────────────
  if (isWeb) {
    return (
      <ErrorBoundary>
        <View style={[s.container, { paddingTop: topInset }]}>
          <LinearGradient colors={['#090A13', '#0F131F', '#0A111C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.webScrollContent, { maxWidth, paddingHorizontal: isDesktop ? 24 : 16 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E7EEF7" />}
          >
            {/* Web header */}
            <View style={[s.webTopRow, isCompactWeb && s.webTopRowCompact]}>
              <View style={s.webTopRowLeft}>
                <View>
                  <Text style={s.webGreeting}>{timeGreeting}, {firstName}</Text>
                  <View style={s.webLocationRow}>
                    <Ionicons name="location-outline" size={13} color="#F2A93B" />
                    <Text style={s.webLocationText}>{state.city || 'Sydney'}, {state.country || 'Australia'}</Text>
                  </View>
                </View>
              </View>
              <View style={[s.webSearchWrap, isCompactWeb && s.webSearchWrapCompact]}>
                <Ionicons name="search-outline" size={18} color="#94A2C4" />
                <TextInput
                  value={webSearch}
                  onChangeText={setWebSearch}
                  placeholder="Search events, communities, venues…"
                  placeholderTextColor="#8F9CBC"
                  style={s.webSearchInput}
                />
                {webSearch.length > 0 && (
                  <Pressable onPress={() => setWebSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                    <Ionicons name="close-circle" size={16} color="#8F9CBC" />
                  </Pressable>
                )}
              </View>
              <View style={[s.webTopActions, isCompactWeb && s.webTopActionsCompact]}>
                <Pressable style={s.webIconBtn} onPress={openNotifications} accessibilityRole="button" accessibilityLabel="Notifications">
                  <Ionicons name="notifications-outline" size={19} color="#EAF0FF" />
                </Pressable>
                <Pressable style={s.webIconBtn} onPress={() => router.push('/map')} accessibilityRole="button" accessibilityLabel="Events map">
                  <Ionicons name="map-outline" size={19} color="#EAF0FF" />
                </Pressable>
                {isAuthenticated ? (
                  <Pressable style={s.webAvatarBtn} onPress={() => router.push('/(tabs)/profile')}>
                    <Text style={s.webAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable style={s.webSignupBtn} onPress={() => router.push('/(onboarding)/signup')}>
                      <Text style={s.webSignupText}>Sign up</Text>
                    </Pressable>
                    <Pressable style={s.webLoginBtn} onPress={() => pushSafe(signInRoute)}>
                      <Text style={s.webLoginText}>Sign in</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.webCategoryChipsRow}>
              {WEB_CATEGORIES.map((cat) => (
                <Pressable key={cat} onPress={() => setWebCategoryFilter(cat)} style={[s.webCategoryChip, webCategoryFilter === cat && s.webCategoryChipActive]}>
                  {webCategoryFilter === cat && (
                    <LinearGradient colors={['#0081C8', '#EE334E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]} />
                  )}
                  <Text style={[s.webCategoryChipText, webCategoryFilter === cat && s.webCategoryChipTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <WebHeroCarousel events={webHeroEvents} />

            {council && (
              <View style={s.webCivicCard}>
                <View style={s.webCivicRow}>
                  <Ionicons name="business-outline" size={16} color="#F2A93B" />
                  <Text style={s.webCivicTitle}>{council.name}</Text>
                </View>
                <Text style={s.webCivicSub}>
                  {isCouncilVerified ? `Council Verified • LGA ${lgaCode}` : `LGA ${lgaCode ?? 'Unknown'}`}
                  {activeAlerts.length > 0 ? ` • ${activeAlerts.length} active alert${activeAlerts.length === 1 ? '' : 's'}` : ''}
                </Text>
                <Pressable style={s.webCivicAction} onPress={() => router.push('/(tabs)/council')}>
                  <Text style={s.webCivicActionText}>Open Council</Text>
                  <Ionicons name="chevron-forward" size={14} color="#EAF0FF" />
                </Pressable>
              </View>
            )}

            {webNearYou.length > 0 && (
              <WebRailSection
                title={`In ${state.city}`}
                subtitle={`Events happening in ${state.city}${state.country ? `, ${state.country}` : ''}`}
                events={categoryFilteredEvents(webNearYou)}
                onSeeAll={() => router.push('/(tabs)/explore')}
              />
            )}
            <WebRailSection
              title={isAuthenticated ? 'Recommended for You' : 'Featured Events'}
              subtitle={isAuthenticated && (state.interests ?? []).length > 0 ? `Based on your interests: ${(state.interests ?? []).slice(0, 3).join(', ')}` : 'Popular picks this week'}
              events={categoryFilteredEvents(webForYou)}
              onSeeAll={() => router.push('/(tabs)/explore')}
            />
            {webActivities.length > 0 && (
              <WebRailSection title="Activities & Workshops" subtitle="Local experiences" events={categoryFilteredEvents(webActivities)} onSeeAll={() => router.push('/activities')} />
            )}
            {webArtists.length > 0 && (
              <WebRailSection title="Featured Artists" subtitle="Live performances & DJs" events={categoryFilteredEvents(webArtists)} onSeeAll={() => router.push('/(tabs)/explore')} />
            )}
            <WebRailSection title="Upcoming Festivals" subtitle="Plan your next month" events={categoryFilteredEvents(webUpcoming)} onSeeAll={() => router.push('/(tabs)/calendar')} />
          </ScrollView>
        </View>
      </ErrorBoundary>
    );
  }

  // ── Native render ─────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <View style={[s.container, { paddingTop: topInset }]}>
        <Head><title>Discover Cultural Events — CulturePass</title></Head>

        {/* ── Top bar ── */}
        <View style={s.topBar}>
          {/* iOS scroll-reactive blur */}
          {Platform.OS === 'ios' && (
            <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]} pointerEvents="none">
              <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}
          {/* Scroll-reactive hairline border */}
          <Animated.View style={[s.topBarBorder, headerBorderStyle]} pointerEvents="none" />

          {/* Brand */}
          <View style={s.brandBlock}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.brandIconBg}>
              <Ionicons name="globe-outline" size={16} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={s.brandName}>CulturePass</Text>
              <Text style={s.brandTagline}>Belong Anywhere</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={s.topBarRight}>
            <Pressable
              style={s.iconBtn}
              onPress={() => router.push('/search')}
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={4}
            >
              <Ionicons name="search-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              style={s.iconBtn}
              onPress={() => router.push('/map')}
              accessibilityRole="button"
              accessibilityLabel="Events Map"
              hitSlop={4}
            >
              <Ionicons name="map-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              style={s.iconBtn}
              onPress={openNotifications}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={4}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {isAuthenticated && <View style={s.notifDot} />}
            </Pressable>
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
        >
          {/* ── Guest hero CTA (single, prominent) ── */}
          {!isAuthenticated && (
            <View style={s.guestHero}>
              <LinearGradient
                colors={gradients.culturepassBrand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={s.guestDecoA} />
              <View style={s.guestDecoB} />
              <Text style={s.guestHeadline}>Discover Your Culture</Text>
              <Text style={s.guestSub}>Save events · join communities · unlock perks</Text>
              <View style={s.guestBtns}>
                <Pressable
                  style={s.guestBtnPrimary}
                  onPress={() => router.push('/(onboarding)/signup')}
                  accessibilityRole="button"
                  accessibilityLabel="Create free account"
                >
                  <Text style={s.guestBtnPrimaryText}>Create Free Account</Text>
                </Pressable>
                <Pressable
                  style={s.guestBtnSecondary}
                  onPress={() => pushSafe(signInRoute)}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                >
                  <Text style={s.guestBtnSecondaryText}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Location picker ── */}
          <View style={s.locationRow}>
            <LocationPicker />
          </View>

          {/* ── Greeting (authenticated only) ── */}
          {isAuthenticated && (
            <View style={s.greetingRow}>
              <View>
                <Text style={s.greetingSub}>{timeGreeting}</Text>
                <Text style={s.greetingName}>{firstName}</Text>
              </View>
              <LinearGradient colors={gradients.culturepassBrandReversed} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.whatsOnPill}>
                <Text style={s.whatsOnText}>What&apos;s On</Text>
              </LinearGradient>
            </View>
          )}

          {/* ── Council banner ── */}
          {council && (
            <Pressable
              style={s.councilBanner}
              onPress={() => router.push('/(tabs)/council')}
              accessibilityRole="button"
              accessibilityLabel={`Open ${council.name}`}
            >
              <View style={s.councilLeft}>
                <View style={s.councilIcon}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.councilName} numberOfLines={1}>{council.name}</Text>
                  <Text style={s.councilSub}>
                    {isCouncilVerified ? `Verified · LGA ${lgaCode}` : `LGA ${lgaCode ?? 'Unknown'}`}
                    {activeAlerts.length > 0 ? ` · ${activeAlerts.length} alert${activeAlerts.length > 1 ? 's' : ''}` : ''}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          )}

          {/* ── Traditional land acknowledgement ── */}
          {land && (
            <View style={s.landBanner}>
              <LinearGradient
                colors={['rgba(139,69,19,0.15)', 'rgba(139,69,19,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={s.landRow}>
                <Ionicons name="earth" size={14} color="#D4A574" />
                <Text style={s.landTitle}>You are on {land.landName}</Text>
              </View>
              <Text style={s.landSub}>Traditional Custodians: {land.traditionalCustodians}</Text>
            </View>
          )}

          {/* ── Super-app category chips ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipScroll}
            style={{ flexGrow: 0, marginBottom: 8 }}
          >
            {superAppSections.map((sec) => (
              <FilterChip
                key={sec.id}
                item={{ id: sec.id, label: sec.label, icon: sec.icon, color: sec.color }}
                isActive={false}
                onPress={() => {
                  Haptics.selectionAsync();
                  pushSafe(SECTION_ROUTES[sec.id]);
                }}
              />
            ))}
          </ScrollView>

          {/* ── Loading ── */}
          {discoverLoading && (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[s.loadingText, { color: colors.textSecondary }]}>Personalising your feed…</Text>
            </View>
          )}

          {/* ── Empty state ── */}
          {!discoverLoading && !featuredEvent && popularEvents.length === 0 && allActivities.length === 0 && allCommunities.length === 0 && spotlights.length === 0 && (
            <View style={[s.emptyCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Ionicons name="compass-outline" size={42} color={colors.textTertiary} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No events in {state.city || 'your area'}</Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>Change your city or pull to refresh.</Text>
              <Pressable
                onPress={() => refetch()}
                style={[s.emptyBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Refresh"
              >
                <Text style={[s.emptyBtnText, { color: colors.textInverse }]}>Refresh</Text>
              </Pressable>
            </View>
          )}

          {/* ── Council Events rail ── */}
          {councilEvents.length > 0 && (
            <View style={s.rail}>
              <View style={s.railHeader}>
                <SectionHeader
                  title="Council Events"
                  subtitle={council?.name ? `From ${council.name}` : 'Local government events'}
                  onSeeAll={() => router.push('/(tabs)/council')}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent} decelerationRate="fast" snapToInterval={254} snapToAlignment="start">
                {councilEvents.slice(0, 10).map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Featured event ── */}
          {featuredEvent && (
            <View style={s.rail}>
              <View style={s.railHeader}>
                <SectionHeader title="Cultural Highlight" subtitle="Don't miss this week" />
              </View>
              <EventCard event={featuredEvent} highlight index={0} />
            </View>
          )}

          {/* ── Popular Near You ── */}
          {popularEvents.length > 0 && (
            <View style={s.rail}>
              <View style={s.railHeader}>
                <SectionHeader title="Popular Near You" onSeeAll={() => router.push('/(tabs)/explore')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent} decelerationRate="fast" snapToInterval={254} snapToAlignment="start">
                {popularEvents.map((event, i) => (
                  <EventCard key={(event as unknown as EventData).id} event={event as unknown as EventData} index={i} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Activities ── */}
          {allActivities.length > 0 && (
            <View style={s.rail}>
              <View style={s.railHeader}>
                <SectionHeader title="Activities" subtitle="Workshops & local experiences" onSeeAll={() => router.push('/activities')} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent}>
                {allActivities.slice(0, 10).map((activity) => (
                  <Pressable
                    key={activity.id}
                    onPress={() => router.push({ pathname: '/activities/[id]', params: { id: activity.id } })}
                    style={[s.activityTile, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                    accessibilityRole="button"
                    accessibilityLabel={activity.name}
                  >
                    <Text style={[s.activityCategory, { color: colors.primary }]}>{activity.category}</Text>
                    <Text numberOfLines={1} style={[s.activityName, { color: colors.text }]}>{activity.name}</Text>
                    <Text numberOfLines={2} style={[s.activityDesc, { color: colors.textSecondary }]}>{activity.description}</Text>
                    <Text style={[s.activityMeta, { color: colors.textTertiary }]}>{activity.city} · {activity.priceLabel || 'Free'}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Cultural Communities ── */}
          {allCommunities.length > 0 && (
            <View style={s.rail}>
              <View style={s.railHeader}>
                <SectionHeader
                  title="Cultural Communities"
                  subtitle={isAuthenticated ? 'Your communities' : 'Join a community'}
                  onSeeAll={() => router.push('/(tabs)/communities')}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent} decelerationRate="fast" snapToInterval={210} snapToAlignment="start">
                {[...allCommunities].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0)).slice(0, 10).map((c, i) => (
                  <CommunityCard key={c.id} community={c} index={i} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── First Nations Spotlight ── */}
          {spotlights.length > 0 && (
            <View style={s.rail}>
              <View style={s.railHeader}>
                <SectionHeader title="First Nations Spotlight" subtitle="Celebrating Indigenous culture" />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent} decelerationRate="fast" snapToInterval={294} snapToAlignment="start">
                {spotlights.map((item: SpotlightItem, i: number) => (
                  <SpotlightCard key={item.id} item={item} index={i} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Explore Your Culture ── */}
          {cultureCards.length > 0 && (
            <View style={s.rail}>
              <View style={s.railHeader}>
                <SectionHeader title="Explore Your Culture" />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent} decelerationRate="fast" snapToInterval={122} snapToAlignment="start">
                {cultureCards.map((item) => (
                  <CategoryCard key={item.id} item={item} onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } })} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Personalised sections from discover feed ── */}
          {otherSections.filter(sec => sec.type === 'events' || sec.type === 'mixed').map((section) => (
            <View key={section.title} style={s.rail}>
              <View style={s.railHeader}>
                <SectionHeader title={section.title} subtitle={section.subtitle} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent} decelerationRate="fast" snapToInterval={254} snapToAlignment="start">
                {section.items.filter((e) => Boolean(e.venue)).slice(0, 10).map((event, i) => (
                  <EventCard key={String((event as unknown as EventData).id)} event={event as unknown as EventData} index={i} />
                ))}
              </ScrollView>
            </View>
          ))}

          {/* ── Browse Categories ── */}
          <View style={s.rail}>
            <View style={s.railHeader}>
              <SectionHeader title="Browse Categories" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.railContent} decelerationRate="fast" snapToInterval={122} snapToAlignment="start">
              {browseCategories.map(cat => (
                <CategoryCard key={cat.id} item={cat} onPress={() => router.push('/(tabs)/explore')} />
              ))}
            </ScrollView>
          </View>

          {/* ── Explore Cities ── */}
          <View style={s.rail}>
            <View style={s.railHeader}>
              <SectionHeader title="Explore Cities" subtitle="Discover culture worldwide" />
            </View>
            <View style={s.citiesGrid}>
              {FEATURED_CITIES.map((city) => (
                <CityCard
                  key={city.name}
                  city={city}
                  width={cityCardWidth}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/(tabs)/explore', params: { city: city.name } });
                  }}
                />
              ))}
            </View>
          </View>

          {/* ── CulturePass PRO banner ── */}
          <View style={s.bannerWrap}>
            <Pressable
              style={({ pressed }) => [s.proBanner, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push('/membership/upgrade')}
              accessibilityRole="button"
              accessibilityLabel="Explore CulturePass PRO membership"
            >
              <LinearGradient colors={['#111', '#1A1A24']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
              <View style={s.proDecoA} />
              <View style={s.proDecoB} />
              <View style={s.bannerLeft}>
                <View style={s.proIconWrap}>
                  <Ionicons name="star" size={20} color={CultureTokens.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bannerTitle}>CulturePass <Text style={{ color: CultureTokens.gold }}>PRO</Text></Text>
                  <Text style={s.bannerSub}>2% cashback & exclusive VIP access</Text>
                </View>
              </View>
              <View style={s.proCta}>
                <Text style={s.proCtaText}>Explore</Text>
              </View>
            </Pressable>
          </View>

          {/* ── Perks banner ── */}
          <View style={s.bannerWrap}>
            <Pressable
              style={({ pressed }) => [s.perksBanner, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push('/perks')}
              accessibilityRole="button"
              accessibilityLabel="Browse perks and benefits"
            >
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
              <View style={s.bannerLeft}>
                <View style={s.perksIconWrap}>
                  <Ionicons name="gift" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bannerTitle}>Perks & Benefits</Text>
                  <Text style={s.bannerSub}>Exclusive discounts and rewards</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* ── Explore All Events ── */}
          <View style={s.bannerWrap}>
            <Pressable
              style={({ pressed }) => [s.exploreCta, { backgroundColor: colors.surface }, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push('/allevents')}
              accessibilityRole="button"
              accessibilityLabel="Explore all events"
            >
              <View style={s.exploreIconWrap}>
                <Ionicons name="compass" size={24} color="#007AFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.exploreTitle, { color: colors.text }]}>Explore All Events</Text>
                <Text style={[s.exploreSub, { color: colors.textTertiary }]}>Discover what&apos;s happening near you</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
        </Animated.ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.background,
  },
  topBarBorder: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
  },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIconBg: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: colors.text, lineHeight: 19 },
  brandTagline: { fontSize: 10, fontFamily: 'Poppins_500Medium', color: colors.primary, lineHeight: 13 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5, borderColor: colors.background,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scrollContent: { paddingBottom: 120 },

  // ── Guest hero ───────────────────────────────────────────────────────────
  guestHero: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    borderRadius: 20, overflow: 'hidden',
    paddingHorizontal: 20, paddingVertical: 24,
  },
  guestDecoA: {
    position: 'absolute', top: -30, right: -20,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  guestDecoB: {
    position: 'absolute', bottom: -20, right: 60,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  guestHeadline: {
    fontSize: 22, fontFamily: 'Poppins_700Bold',
    color: '#fff', marginBottom: 6, letterSpacing: -0.3,
  },
  guestSub: {
    fontSize: 13, fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.82)', marginBottom: 20, lineHeight: 20,
  },
  guestBtns: { flexDirection: 'row', gap: 10 },
  guestBtnPrimary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 13,
  },
  guestBtnPrimaryText: {
    fontSize: 14, fontFamily: 'Poppins_700Bold', color: CultureTokens.indigo,
  },
  guestBtnSecondary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  guestBtnSecondaryText: {
    fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#fff',
  },

  // ── Location ─────────────────────────────────────────────────────────────
  locationRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },

  // ── Greeting ─────────────────────────────────────────────────────────────
  greetingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 16, marginBottom: 4,
  },
  greetingSub: {
    fontSize: 13, fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary, marginBottom: 2,
  },
  greetingName: {
    fontSize: 22, fontFamily: 'Poppins_700Bold',
    color: colors.text, letterSpacing: -0.3,
  },
  whatsOnPill: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  whatsOnText: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#fff' },

  // ── Council banner ────────────────────────────────────────────────────────
  councilBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    padding: 12, borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight,
  },
  councilLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  councilIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  councilName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  councilSub: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: colors.textSecondary, marginTop: 1 },

  // ── Land banner ───────────────────────────────────────────────────────────
  landBanner: {
    borderRadius: 12, padding: 12, paddingLeft: 16,
    borderLeftWidth: 3, borderLeftColor: '#D4A574',
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    overflow: 'hidden',
  },
  landRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  landTitle: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#D4A574' },
  landSub: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: '#8B7355', marginTop: 3, marginLeft: 20 },

  // ── Category chips ────────────────────────────────────────────────────────
  chipScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },

  // ── Loading / empty ───────────────────────────────────────────────────────
  loadingWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
  emptyCard: {
    marginHorizontal: 16, marginBottom: 24, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 14 },
  emptyBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // ── Content rails ─────────────────────────────────────────────────────────
  rail: { marginBottom: 30 },
  railHeader: { paddingHorizontal: 16 },
  railContent: { paddingHorizontal: 16, gap: 14 },

  // ── Activity tiles ────────────────────────────────────────────────────────
  activityTile: {
    width: 230, borderRadius: 16, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, gap: 5,
  },
  activityCategory: {
    fontSize: 11, fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  activityName: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  activityDesc: { fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 18, minHeight: 36 },
  activityMeta: { fontSize: 12, fontFamily: 'Poppins_500Medium' },

  // ── Cities grid ───────────────────────────────────────────────────────────
  citiesGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  // ── Banners ───────────────────────────────────────────────────────────────
  bannerWrap: { paddingHorizontal: 16, marginBottom: 14 },
  proBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 20, overflow: 'hidden',
  },
  proDecoA: {
    position: 'absolute', top: -30, right: -10,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  proDecoB: {
    position: 'absolute', bottom: -20, right: 50,
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  proIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,215,0,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
  },
  bannerTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#fff' },
  bannerSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  proCta: { backgroundColor: CultureTokens.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  proCtaText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#000' },
  perksBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 20, overflow: 'hidden',
  },
  perksIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  exploreCta: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 20,
  },
  exploreIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  exploreTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  exploreSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 2 },

  // ── Web ───────────────────────────────────────────────────────────────────
  webScrollContent: {
    paddingHorizontal: 16, paddingBottom: 120, gap: 24,
    maxWidth: 1200, width: '100%', alignSelf: 'center',
  },
  webTopRow: {
    marginTop: 12, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', gap: 20, paddingBottom: 20,
  },
  webTopRowCompact: { flexWrap: 'wrap', rowGap: 12 },
  webTopRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 },
  webGreeting: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#E8F0FF', lineHeight: 22 },
  webLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  webLocationText: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: '#94A2C4' },
  webSearchWrap: {
    flex: 1, height: 48, borderRadius: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', maxWidth: 600,
  },
  webSearchWrapCompact: { minWidth: '100%', maxWidth: '100%' },
  webSearchInput: {
    flex: 1, height: '100%' as unknown as number,
    color: '#E8F0FF', fontSize: 14, fontFamily: 'Poppins_500Medium',
  } as object,
  webTopActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  webTopActionsCompact: { marginLeft: 'auto' },
  webIconBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  webAvatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.error, overflow: 'hidden',
  },
  webAvatarText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#fff' },
  webLoginBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  webSignupBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'transparent', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)', justifyContent: 'center', alignItems: 'center',
  },
  webLoginText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFF' },
  webSignupText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#EAF0FF' },
  webCategoryChipsRow: { gap: 8, paddingBottom: 4, paddingHorizontal: 2 },
  webCategoryChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden',
  },
  webCategoryChipActive: { borderColor: 'transparent' },
  webCategoryChipText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  webCategoryChipTextActive: { color: colors.text, fontFamily: 'Poppins_600SemiBold' },
  webCivicCard: {
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 10,
  },
  webCivicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  webCivicTitle: { color: '#EAF0FF', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  webCivicSub: { color: '#94A2C4', fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 4 },
  webCivicAction: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  webCivicActionText: { color: '#EAF0FF', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
});
