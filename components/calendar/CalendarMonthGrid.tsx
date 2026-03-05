import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import type { EventData } from '@/shared/schema';

interface CalendarMonthGridProps {
  events: EventData[];
  selectedDate: number | null;
  onSelectDate: (day: number) => void;
  year: number;
  month: number; // 0-indexed
}

export default function CalendarMonthGrid({
  events,
  selectedDate,
  onSelectDate,
  year,
  month,
}: CalendarMonthGridProps) {
  const colors = useColors();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  // Compute actual days in the given month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function press(day: number) {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onSelectDate(day);
  }

  return (
    <View style={styles.grid}>
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
        const dayEvents = events.filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
        const isSelected = selectedDate === day;
        const isToday = day === todayDate;

        return (
          <Pressable
            key={day}
            style={[
              styles.cell,
              isSelected && { backgroundColor: colors.primary, borderRadius: 10 },
              isToday && !isSelected && { borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary },
            ]}
            onPress={() => press(day)}
            accessibilityRole="button"
            accessibilityLabel={`Day ${day}${dayEvents.length > 0 ? `, ${dayEvents.length} events` : ''}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.day,
                { color: isSelected ? colors.textInverse : isToday ? colors.primary : colors.text },
                isSelected && { fontFamily: 'Poppins_700Bold' },
              ]}
            >
              {day}
            </Text>
            <View style={styles.dotsRow}>
              {dayEvents.slice(0, 3).map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    { backgroundColor: isSelected ? colors.textInverse : colors.primary },
                  ]}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 2,
  },
  day: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    minHeight: 5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
