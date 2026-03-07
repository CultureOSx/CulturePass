import { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/_styles';
import { CP } from '../../constants';

export const DetailRow = memo(({
  icon, iconBg, iconColor, label, value, valueColor, onPress, showArrow,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string; iconColor: string;
  label: string; value: string;
  valueColor?: string; onPress?: () => void; showArrow?: boolean;
}) => {
  const content = (
    <>
      <View style={[styles.detailIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.detailText}>
        {/* ...existing code... */}
      </View>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={styles.detailRow}>
      {content}
      {showArrow && <Ionicons name="chevron-forward" size={16} color={CP.muted} style={{ marginLeft: 8 }} />}
    </Pressable>
  ) : (
    <View style={styles.detailRow}>{content}</View>
  );
});
DetailRow.displayName = 'DetailRow';