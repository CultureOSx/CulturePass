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

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // FIX: compute the weekday offset so day 1 starts in the correct column.
  // getDay() returns 0=Sun..6=Sat. We use a Sunday-first grid to match
  // the standard calendar layout expected by users.
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun, 6=Sat

  function press(day: number) {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onSelectDate(day);
  }

  return (
    <View style={styles.grid}>
      {/* Day-of-week header row */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
        <View key={label} style={styles.headerCell}>
          <Text style={[styles.headerLabel, { color: colors.textTertiary }]}>{label}</Text>
        </View>
      ))}

      {/* FIX: leading empty cells to push day 1 to the correct weekday column */}
      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.cell} />
      ))}

      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
        const dayEvents = events.filter((e) => {
          // FIX: parse date components directly to avoid UTC-vs-local timezone
          // offset shifting the event onto the wrong day. If e.date is an ISO
          // string ("2025-03-15" or "2025-03-15T00:00:00Z"), split on 'T' and
          // parse the date portion directly so the comparison is always local.
          const datePart = typeof e.date === 'string' ? e.date.split('T')[0] : null;
          if (datePart) {
            const [y, m, d] = datePart.split('-').map(Number);
            return y === year && m - 1 === month && d === day;
          }
          // Fallback for Date objects or unexpected formats
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
  headerCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingBottom: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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