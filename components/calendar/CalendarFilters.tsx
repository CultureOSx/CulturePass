import { Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

const FILTERS = ['All', 'Festival', 'Movie', 'Workshop', 'Council'] as const;
type FilterOption = (typeof FILTERS)[number];

interface CalendarFiltersProps {
  onFilter: (filter: FilterOption) => void;
  initialFilter?: FilterOption;
}

export default function CalendarFilters({ onFilter, initialFilter = 'All' }: CalendarFiltersProps) {
  const colors = useColors();
  const [selected, setSelected] = useState<FilterOption>(initialFilter);

  function select(filter: FilterOption) {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelected(filter);
    onFilter(filter);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => {
        const isActive = selected === filter;
        return (
          <Pressable
            key={filter}
            onPress={() => select(filter)}
            style={[
              styles.filter,
              {
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderColor: isActive ? colors.primary : colors.borderLight,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter by ${filter}`}
          >
            <Text
              style={[
                styles.text,
                { color: isActive ? colors.textInverse : colors.text },
              ]}
            >
              {filter}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
});
