/**
 * useColors — light-mode color hook for CulturePassAU.
 *
 * Always returns the light theme — CulturePass uses a clean white/light
 * design system across all platforms (iOS, Android, web).
 *
 * Usage:
 *   const colors = useColors();
 *   <View style={{ backgroundColor: colors.background }} />
 *   <Text style={{ color: colors.text }} />
 *
 * For static use (e.g. in StyleSheet.create at module level where hooks
 * cannot be called), import Colors directly:
 *   import Colors from '@/constants/colors';
 *   // Colors.primary, Colors.background, etc. (maps to light theme)
 */

import type { ColorTheme } from '@/constants/colors';
import { light } from '@/constants/colors';

export function useColors(): ColorTheme {
  return light;
}

// ---------------------------------------------------------------------------
// Selector variant — access a single token without re-rendering on
// unrelated color changes (useful for components that only use one color).
//
// Usage:
//   const primary = useColor('primary');
// ---------------------------------------------------------------------------
export function useColor<K extends keyof ColorTheme>(key: K): ColorTheme[K] {
  return light[key];
}

// ---------------------------------------------------------------------------
// Utilities for inline platform-aware color decisions
// ---------------------------------------------------------------------------

/** Always returns `lightValue` — CulturePass is light-mode only */
export function useSchemeValue<T>(_darkValue: T, lightValue: T): T {
  return lightValue;
}

/** Always returns false — CulturePass is light-mode only */
export function useIsDark(): boolean {
  return false;
}
