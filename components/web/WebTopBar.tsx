import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { CultureTokens } from "@/constants/theme";
import { useAuth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// FIX: moved outside component — no reason to recreate on every render
// ---------------------------------------------------------------------------
const TAB_ROUTES: { label: string; route: string }[] = [
  { label: "Discover",  route: "/(tabs)" },
  { label: "Calendar",  route: "/(tabs)/calendar" },
  { label: "Community", route: "/(tabs)/communities" },
  { label: "Perks",     route: "/(tabs)/perks" },
  { label: "Profile",   route: "/(tabs)/profile" },
];

// ---------------------------------------------------------------------------
// FIX: safe haptics wrapper — expo-haptics is native-only and throws on web
// ---------------------------------------------------------------------------
async function triggerHaptic() {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // silently ignore if haptics unavailable
  }
}

// ---------------------------------------------------------------------------
// FIX: active-route helper consistent with WebSidebar normalisation
// ---------------------------------------------------------------------------
function isTabActive(route: string, pathname: string): boolean {
  if (route === "/(tabs)") {
    return pathname === "/" || pathname === "" || pathname === "/index";
  }
  const bare = route.replace("/(tabs)", "");
  return pathname === bare || pathname.startsWith(bare + "/");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WebTopBar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  const displayName =
    user?.displayName ?? user?.username ?? user?.id?.slice(0, 8) ?? "You";

  // FIX: cast route to the type router.push expects — same pattern as WebSidebar
  const navigate = (route: string) => {
    try {
      router.push(route as Parameters<typeof router.push>[0]);
    } catch {
      // no-op on unresolvable routes
    }
  };

  return (
    <View style={styles.container}>
      {/* Left: Logo + Name */}
      <Pressable
        style={styles.left}
        onPress={() => navigate("/(tabs)")}
        accessibilityLabel="Home"
      >
        <LinearGradient
          colors={[CultureTokens.indigo, CultureTokens.saffron]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBg}
        >
          <Ionicons name="globe-outline" size={22} color="#fff" />
        </LinearGradient>
        <Text style={styles.appName}>CulturePass</Text>
      </Pressable>

      {/* Center: Navigation Tabs with active highlighting */}
      <View style={styles.center}>
        {TAB_ROUTES.map(({ label, route }) => {
          const active = isTabActive(route, pathname);
          return (
            <Pressable
              key={route}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => navigate(route)}
              accessibilityLabel={label}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: active }}
              aria-current={active ? "page" : undefined}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
              {/* FIX: active underline indicator */}
              {active && <View style={styles.tabUnderline} />}
            </Pressable>
          );
        })}
      </View>

      {/* Right: Notifications, Map, and auth-aware CTA */}
      <View style={styles.right}>
        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Notifications"
          onPress={() => {
            triggerHaptic(); // FIX: safe — no-op on web
            if (isAuthenticated) {
              navigate("/notifications");
            } else {
              navigate("/(onboarding)/login?redirectTo=%2Fnotifications");
            }
          }}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={CultureTokens.saffron}
          />
        </Pressable>

        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Map"
          onPress={() => {
            triggerHaptic(); // FIX: safe — no-op on web
            navigate("/map");
          }}
        >
          <Ionicons name="map-outline" size={20} color={CultureTokens.teal} />
        </Pressable>

        {/* FIX: show Sign Up only when not authenticated; show user + sign out otherwise */}
        {isAuthenticated ? (
          <View style={styles.authRow}>
            <Text style={styles.authName} numberOfLines={1}>
              {displayName}
            </Text>
            <Pressable
              style={styles.iconBtn}
              accessibilityLabel="Sign out"
              onPress={() => logout()}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.signUpBtn}
            accessibilityLabel="Sign Up"
            onPress={() => navigate("/(onboarding)/signup")}
          >
            <Text style={styles.signUpText}>Sign Up</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    width: "100%" as unknown as number,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2C2A72",
    borderBottomWidth: 2,
    borderBottomColor: "#FF8C42",
    paddingVertical: 12,
    paddingHorizontal: 40,
    minHeight: 72,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  appName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 2,
    fontFamily: "Poppins_700Bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  center: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    flex: 1,
    justifyContent: "center",
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    position: "relative",
  },
  // FIX: subtle bg tint on active tab
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 1,
  },
  // FIX: full white + bold for active tab label
  tabTextActive: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
  },
  // FIX: orange underline indicator matching brand accent
  tabUnderline: {
    position: "absolute",
    bottom: -2,
    left: 6,
    right: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: CultureTokens.saffron,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FF8C42",
  },
  signUpText: {
    color: "#FFC857",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1,
    textShadowColor: "#22203A",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // FIX: authenticated user display
  authRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 160,
  },
  authName: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    flexShrink: 1,
  },
});