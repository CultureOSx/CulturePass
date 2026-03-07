import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, FlexStyle } from 'react-native';
import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth';
import { useRole } from '@/hooks/useRole';
import { CultureTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Nav item definition
// ---------------------------------------------------------------------------
interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
  matchPrefix?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { label: 'Discover',   icon: 'compass-outline',       iconActive: 'compass',        route: '/(tabs)' },
  { label: 'Calendar',   icon: 'calendar-outline',      iconActive: 'calendar',       route: '/(tabs)/calendar' },
  { label: 'Community',  icon: 'people-circle-outline', iconActive: 'people-circle',  route: '/(tabs)/communities' },
  { label: 'Perks',      icon: 'gift-outline',          iconActive: 'gift',           route: '/(tabs)/perks' },
  { label: 'Profile',    icon: 'person-circle-outline', iconActive: 'person-circle',  route: '/(tabs)/profile' },
];

const EXPLORE_NAV: NavItem[] = [
  { label: 'All Events',  icon: 'calendar-number-outline', iconActive: 'calendar-number', route: '/allevents', matchPrefix: true },
  { label: 'Map View',    icon: 'map-outline',              iconActive: 'map',             route: '/map' },
  { label: 'Directory',   icon: 'storefront-outline',       iconActive: 'storefront',      route: '/(tabs)/directory', matchPrefix: true },
  { label: 'Saved',       icon: 'bookmark-outline',         iconActive: 'bookmark',        route: '/saved' },
];

const ORGANIZER_NAV: NavItem[] = [
  { label: 'Dashboard',    icon: 'grid-outline',             iconActive: 'grid',             route: '/dashboard/organizer', matchPrefix: true },
  { label: 'Council Ops',  icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark', route: '/dashboard/council', matchPrefix: true },
  { label: 'Submit Event', icon: 'add-circle-outline',       iconActive: 'add-circle',       route: '/submit' },
  { label: 'Scanner',      icon: 'qr-code-outline',          iconActive: 'qr-code',          route: '/scanner' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Council Mgmt', icon: 'business-outline',  iconActive: 'business',  route: '/admin/council-management', matchPrefix: true },
  { label: 'Users',        icon: 'people-outline',    iconActive: 'people',    route: '/admin/users', matchPrefix: true },
  { label: 'Audit Logs',   icon: 'list-outline',      iconActive: 'list',      route: '/admin/audit-logs', matchPrefix: true },
  { label: 'Notify',       icon: 'megaphone-outline', iconActive: 'megaphone', route: '/admin/notifications', matchPrefix: true },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return initials || '?';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WebSidebar() {
  const pathname = usePathname();
  const colors = useColors();
  const { user, logout, isAuthenticated, userId } = useAuth();
  const { isOrganizer, isAdmin, role } = useRole();
  const [collapsed, setCollapsed] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const allNavItems = useMemo<NavItem[]>(() => [
    ...MAIN_NAV,
    ...EXPLORE_NAV,
    ...(isOrganizer ? ORGANIZER_NAV : []),
    ...(isAdmin ? ADMIN_NAV : []),
  ], [isOrganizer, isAdmin]);

  const { data: notifCount = 0 } = useQuery<number>({
    queryKey: [`/api/notifications/${userId}/unread-count`],
    queryFn: async () => {
      if (!userId) return 0;
      const res = await api.raw<{ count: number }>('GET', `api/notifications/${userId}/unread-count`);
      return (res as { count?: number }).count ?? 0;
    },
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  const withBadge = useCallback((items: NavItem[]): NavItem[] =>
    items.map((item) =>
      item.label === 'Profile' && notifCount > 0
        ? { ...item, badge: notifCount }
        : item
    ), [notifCount]);

  const navigate = useCallback((route: string) => {
    try {
      router.push(route as any);
    } catch {
      if (typeof window !== 'undefined') {
        window.alert('Navigation failed.');
      }
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!document.activeElement) return;
      if (e.key === 'ArrowDown') {
        setFocusedIndex((idx) => Math.min(allNavItems.length - 1, idx + 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setFocusedIndex((idx) => Math.max(0, idx - 1));
        e.preventDefault();
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        navigate(allNavItems[focusedIndex].route);
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allNavItems, focusedIndex, navigate]);

  const isActive = useCallback((item: NavItem): boolean => {
    const normalise = (p: string) => p.replace('/(tabs)', '').replace(/^$/, '/') || '/';
    const normRoute = normalise(item.route);
    if (item.route === '/(tabs)') {
      return pathname === '/' || pathname === '' || pathname === '/index';
    }
    if (item.matchPrefix) {
      return pathname.startsWith(normRoute);
    }
    return pathname === normRoute || pathname.startsWith(normRoute + '/');
  }, [pathname]);

  const sidebarWidth = collapsed ? 64 : 240;
  const displayName = user?.displayName ?? user?.username ?? user?.id?.slice(0, 8) ?? 'You';
  const initials = getInitials(displayName);

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'platformAdmin': return 'Platform Admin';
      case 'admin':         return 'Admin';
      case 'organizer':     return 'Organizer';
      case 'moderator':     return 'Moderator';
      default:              return null;
    }
  }, [role]);

  return (
    <View style={[
      collapsed ? styles.sidebarCollapsed : styles.sidebar, 
      { width: sidebarWidth, backgroundColor: colors.surface, borderRightColor: colors.border }
    ]}>
      <View style={collapsed ? styles.logoCollapsed : styles.logoExpanded}>
        <View style={styles.logoIcon}>
          <LinearGradient colors={['#2C2A72', '#FF8C42']} style={StyleSheet.absoluteFill} />
          <Ionicons name="globe-outline" size={collapsed ? 16 : 18} color="#fff" />
        </View>
        {!collapsed && (
          <View style={{ flex: 1 }}>
            <Text style={styles.logoText}>CulturePass</Text>
            <Text style={styles.logoUrl}>culturepass.app</Text>
          </View>
        )}
        <Pressable onPress={() => setCollapsed(!collapsed)}>
          <Ionicons name={collapsed ? "chevron-forward-outline" : "chevron-back-outline"} size={18} color="rgba(0,22,40,0.4)" />
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      
      <View style={{ flex: 1 }}>
        <SectionGroup>
          {withBadge(MAIN_NAV).map((item) => (
            <SidebarItem key={item.route} item={item} active={isActive(item)} collapsed={collapsed} onPress={() => navigate(item.route)} />
          ))}
        </SectionGroup>

        {!collapsed && <SectionLabel label="Explore" />}
        <SectionGroup>
          {EXPLORE_NAV.map((item) => (
            <SidebarItem key={item.route} item={item} active={isActive(item)} collapsed={collapsed} onPress={() => navigate(item.route)} />
          ))}
        </SectionGroup>

        {isOrganizer && (
          <>
            {!collapsed && <SectionLabel label="Organizer" />}
            <SectionGroup>
              {ORGANIZER_NAV.map((item) => (
                <SidebarItem key={item.route} item={item} active={isActive(item)} collapsed={collapsed} onPress={() => navigate(item.route)} />
              ))}
            </SectionGroup>
          </>
        )}

        {isAdmin && (
          <>
            {!collapsed && <SectionLabel label="Admin" />}
            <SectionGroup>
              {ADMIN_NAV.map((item) => (
                <SidebarItem key={item.route} item={item} active={isActive(item)} collapsed={collapsed} onPress={() => navigate(item.route)} />
              ))}
            </SectionGroup>
          </>
        )}
      </View>

      <View style={[styles.userSection, { borderTopColor: colors.border }]}>
        {isAuthenticated ? (
          <View style={styles.userInfoRow}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <LinearGradient colors={['#2C2A72', '#FF8C42']} style={StyleSheet.absoluteFill} />
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            {!collapsed && (
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                {roleLabel && <Text style={styles.roleLabelText}>{roleLabel}</Text>}
              </View>
            )}
            {!collapsed && (
              <Pressable onPress={() => logout()} hitSlop={8}>
                <Ionicons name="log-out-outline" size={20} color="rgba(0,22,40,0.45)" />
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable style={styles.signInBtn} onPress={() => router.push('/(onboarding)/login')}>
            <LinearGradient colors={['#2C2A72', '#FF8C42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="person-outline" size={16} color="#fff" />
            {!collapsed && <Text style={styles.signInText}>Sign In</Text>}
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SectionGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.navGroup}>{children}</View>;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{label}</Text>
    </View>
  );
}

function SidebarItem({ item, active, collapsed, onPress }: { item: NavItem; active: boolean; collapsed: boolean; onPress: () => void; }) {
  const colors = useColors();
  const iconColor = active ? colors.primary : colors.textSecondary;

  return (
    <Pressable
      style={({ hovered }: any) => [
        itemStyles.item,
        active && { backgroundColor: colors.primaryGlow },
        hovered && { backgroundColor: 'rgba(44,42,114,0.08)' },
        collapsed && { justifyContent: 'center', paddingHorizontal: 0 }
      ]}
      onPress={onPress}
      // @ts-ignore - title is valid for tooltips on web
      title={collapsed ? item.label : undefined}
    >
      <Ionicons name={active ? item.iconActive : item.icon} size={20} color={iconColor} />
      {!collapsed && (
        <Text style={[itemStyles.label, { color: active ? colors.primary : colors.text }, active && itemStyles.labelActive]} numberOfLines={1}>
          {item.label}
        </Text>
      )}
      {(item.badge ?? 0) > 0 && (
        <View style={collapsed ? styles.badgeDot : styles.badge}>
          <Text style={styles.badgeText}>{!collapsed && item.badge! > 99 ? '99+' : item.badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebar: { 
    // FIXED: Removed flex: 1 to prevent splitting the screen with siblings
    alignSelf: 'stretch' as FlexStyle['alignSelf'], 
    borderRightWidth: 1, 
    paddingTop: 20, 
    flexShrink: 0 
  },
  sidebarCollapsed: { 
    // FIXED: Removed flex: 1 to prevent splitting the screen with siblings
    alignSelf: 'stretch' as FlexStyle['alignSelf'], 
    borderRightWidth: 1, 
    paddingTop: 16, 
    flexShrink: 0, 
    alignItems: 'center' 
  },
  logoExpanded: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  logoCollapsed: { alignItems: 'center', paddingBottom: 16, gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#000' },
  logoUrl: { fontSize: 10, color: 'rgba(0,22,40,0.35)' },
  divider: { height: 1, marginHorizontal: 14, marginVertical: 6 },
  navGroup: { paddingHorizontal: 8, paddingVertical: 2, gap: 1 },
  sectionLabel: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 2 },
  sectionLabelText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(0,22,40,0.35)' },
  userSection: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarText: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#fff' },
  userName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#001628' },
  roleLabelText: { fontSize: 10, color: CultureTokens.indigo, fontFamily: 'Poppins_600SemiBold' },
  signInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 38, borderRadius: 10, overflow: 'hidden' },
  signInText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#fff' },
  badge: { backgroundColor: CultureTokens.coral, borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, fontFamily: 'Poppins_700Bold', color: '#fff' },
  badgeDot: { position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: CultureTokens.coral },
});

const itemStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10 },
  label: { fontSize: 13, fontFamily: 'Poppins_500Medium', flex: 1 },
  labelActive: { fontFamily: 'Poppins_600SemiBold' },
});