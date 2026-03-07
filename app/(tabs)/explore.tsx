import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import BrowsePage, { BrowseItem, CategoryFilter } from '@/components/BrowsePage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { api } from '@/lib/api';
import type { EventData } from '@/shared/schema';
import { CultureTokens } from '@/constants/theme';

// Category chip colors use stable brand tokens — they do not change between
// light and dark mode, which is intentional (brand colours are always vibrant).
const eventCategories: CategoryFilter[] = [
  { label: 'All',       icon: 'calendar',      color: CultureTokens.indigo  },
  { label: 'Music',     icon: 'musical-notes', color: CultureTokens.coral   },
  { label: 'Dance',     icon: 'body',          color: CultureTokens.saffron },
  { label: 'Food',      icon: 'restaurant',    color: CultureTokens.gold    },
  { label: 'Art',       icon: 'color-palette', color: CultureTokens.teal    },
  { label: 'Wellness',  icon: 'heart',         color: CultureTokens.coral   },
  { label: 'Film',      icon: 'film',          color: CultureTokens.gold    },
  { label: 'Workshop',  icon: 'construct',     color: CultureTokens.saffron },
  { label: 'Heritage',  icon: 'library',       color: CultureTokens.teal    },
];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default function ExploreScreen() {
  const { state } = useOnboarding();
  const params = useLocalSearchParams<{ city?: string }>();

  const cityParam = Array.isArray(params.city) ? params.city[0] : params.city;
  const activeCity = cityParam || state.city;

  const { data: events = [], isLoading, error, refetch } = useQuery<EventData[]>({
    queryKey: ['/api/events', state.country, activeCity],
    queryFn: async () => {
      const data = await api.events.list({ city: activeCity, country: state.country, pageSize: 50 });
      return data.events ?? [];
    },
  });

  const browseItems: BrowseItem[] = events
    .filter((event) => Boolean(event.id))
    .map((event) => ({
    id: event.id,
    title: event.title,
    subtitle: `${formatDate(event.date)} | ${event.venue}`,
    description: event.description,
    imageUrl: event.imageUrl,
    rating: event.attending ? undefined : undefined,
    priceLabel: event.priceCents === 0 ? 'Free' : event.priceLabel,
    isPromoted: event.isFeatured,
    badge: event.communityTag,
    category: event.category,
    meta: `${event.attending} attending`,
  }));

  const promotedItems = browseItems.filter((item) => item.isPromoted);

  const handleItemPress = (item: BrowseItem) => {
    router.push({ pathname: '/event/[id]', params: { id: item.id } });
  };

  return (
    <ErrorBoundary>
      <BrowsePage
        title={cityParam ? `Events in ${cityParam}` : "Events"}
        accentColor={CultureTokens.indigo}
        accentIcon="calendar"
        categories={eventCategories}
        categoryKey="category"
        items={browseItems}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        promotedItems={promotedItems}
        promotedTitle="Featured Events"
        onItemPress={handleItemPress}
        emptyMessage="No events found"
        emptyIcon="calendar-outline"
      />
    </ErrorBoundary>
  );
}
