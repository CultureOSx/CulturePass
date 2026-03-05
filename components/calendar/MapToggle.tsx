import { View, Text, Switch, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface MapToggleProps {
  showMap: boolean;
  onToggle: (value: boolean) => void;
}

export default function MapToggle({ showMap, onToggle }: MapToggleProps) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.text }]}>Map View</Text>
      <Switch
        value={showMap}
        onValueChange={onToggle}
        accessibilityRole="switch"
        accessibilityLabel="Toggle map view"
        accessibilityState={{ checked: showMap }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
});
