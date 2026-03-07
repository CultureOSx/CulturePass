import { Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

const TABS = ['All', 'My Events', 'Tickets', 'Council', 'Interests'] as const;
type Tab = (typeof TABS)[number];

interface CalendarTabsProps {
  onChange: (tab: Tab) => void;
  initialTab?: Tab;
}

export default function CalendarTabs({ onChange, initialTab = 'All' }: CalendarTabsProps) {
  const colors = useColors();
  const [active, setActive] = useState<Tab>(initialTab);

  function select(tab: Tab) {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setActive(tab);
    onChange(tab);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TABS.map((tab) => {
        const isActive = active === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => select(tab)}
            style={[
              styles.tab,
              {
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderColor: isActive ? colors.primary : colors.borderLight,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab}
          >
            <Text
              style={[
                styles.text,
                {
                  color: isActive ? colors.textInverse : colors.textSecondary,
                  fontFamily: isActive ? 'Poppins_600SemiBold' : 'Poppins_500Medium',
                },
              ]}
            >
              {tab}
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
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
  },
});
