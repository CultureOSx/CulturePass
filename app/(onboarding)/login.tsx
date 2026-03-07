import { View, Text, Pressable, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, useWindowDimensions, NativeModules } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradients } from '@/constants/theme';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { auth as firebaseAuth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SocialButton } from '@/components/ui/SocialButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useColors } from '@/hooks/useColors';
import * as AppleAuthentication from 'expo-apple-authentication';

function isInternalRoute(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('://');
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const { state: onboardingState } = useOnboarding();
  const searchParams = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isValid = email.trim().length > 0 && password.length >= 6;

  const { completeOnboarding } = useOnboarding();
  const postAuthRoute = async () => {
    // If a redirect target was provided (e.g. ?redirectTo=/event/abc), go there.
    const redirectToRaw = (searchParams?.redirectTo as string) || (searchParams?.redirect as string) || null;
    const redirectTo = redirectToRaw && isInternalRoute(redirectToRaw) ? redirectToRaw : null;
    if (redirectTo) {
      // Use replace so user can't go back to login again
      router.replace(redirectTo);
      return;
    }

    // If onboarding incomplete send to onboarding location step
    if (!onboardingState.isComplete) {
      // Fallback: If user profile is complete, complete onboarding
      if (email && password) {
        await completeOnboarding();
        router.replace('/(tabs)');
        return;
      }
      router.push('/(onboarding)/location');
      return;
    }

    // Prefer returning to previous history entry when possible (e.g., user came from a protected page)
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(firebaseAuth, provider);
      } else {
        // Native: use @react-native-google-signin/google-signin
        // Not available in Expo Go — requires a development or production build
        if (!NativeModules.RNGoogleSignin) {
          setError('Google Sign-In requires a development build. Use email/password instead.');
          setLoading(false);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        const credential = GoogleAuthProvider.credential(tokens.idToken);
        await signInWithCredential(firebaseAuth, credential);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      postAuthRoute();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (
        code !== 'auth/popup-closed-by-user' &&
        code !== 'auth/cancelled-popup-request' &&
        code !== '-5'  // Google Sign-In cancelled by user on native
      ) {
        setError('Google sign-in failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: credential.identityToken ?? '',
        rawNonce: credential.authorizationCode ?? '',
      });
      await signInWithCredential(firebaseAuth, firebaseCredential);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      postAuthRoute();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in failed. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      postAuthRoute();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Sign in failed. Please try again.');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared form fields (used in both mobile & desktop) ──────────────────
  const formFields = (
    <>
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.error + '18', borderColor: colors.error + '40' }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Input
          label="Email Address"
          placeholder="your@email.com"
          leftIcon="mail-outline"
          value={email}
          onChangeText={(v) => { setEmail(v); if (error) setError(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <View>
          <View style={styles.passwordHeader}>
            <Text style={[styles.label, { color: isDesktop ? colors.text : colors.textInverse }]}>Password</Text>
            <Pressable
              onPress={() => router.push('/(onboarding)/forgot-password')}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
              hitSlop={8}
            >
              <Text style={[styles.forgotText, { color: isDesktop ? colors.primary : colors.warning }]}>Forgot Password?</Text>
            <Pressable
              style={styles.switchRow}
              onPress={() => router.replace('/login/signup')}
              accessibilityRole="link"
              accessibilityLabel="Don't have an account? Sign up"
            >
              <Text style={[styles.switchText, { color: colors.textInverse + 'D9' }]}>Don't have an account? <Text style={[styles.switchLink, { color: colors.warning }]}>Sign Up</Text></Text>
            </Pressable>
            passwordToggle
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>
      </View>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        rightIcon="arrow-forward"
        loading={loading}
        disabled={!isValid || loading}
        onPress={handleLogin}
        style={styles.submitBtn}
        accessibilityLabel="Sign in to your CulturePass account"
      >
        Sign In
      </Button>

      <View style={styles.socialDivider}>
        <View style={[styles.divLine, { backgroundColor: isDesktop ? colors.border : colors.textInverse + '50' }]} />
        <Text style={[styles.divText, { color: isDesktop ? colors.textSecondary : colors.textInverse + 'CC' }]}>or continue with</Text>
        <View style={[styles.divLine, { backgroundColor: isDesktop ? colors.border : colors.textInverse + '50' }]} />
      </View>

      <View style={styles.socialRow}>
        <SocialButton provider="google" onPress={handleGoogleSignIn} disabled={loading} />
        {Platform.OS === 'ios'
          ? <SocialButton provider="apple" onPress={handleAppleSignIn} disabled={loading} />
          : <SocialButton provider="apple" comingSoon disabled={loading} />
        }
      </View>

      <Pressable
        style={styles.switchRow}
        onPress={() => router.replace('/(onboarding)/signup')}
        accessibilityRole="link"
        accessibilityLabel="Don't have an account? Sign up"
      >
        <Text style={[styles.switchText, { color: isDesktop ? colors.textSecondary : colors.textInverse + 'CC' }]}>
          Don&apos;t have an account?{' '}
          <Text style={[styles.switchLink, { color: isDesktop ? colors.primary : colors.warning }]}>Sign Up</Text>
        </Text>
      </Pressable>
    </>
  );

  // ── Desktop: centred card on gradient ────────────────────────────────────
  if (isDesktop) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={[styles.container, styles.desktopWrapper]}>
          <Head><title>Sign In — CulturePass</title></Head>
          <LinearGradient colors={gradients.culturepassBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.95 }} style={StyleSheet.absoluteFillObject} />
          <View style={styles.desktopBackRow}>
            <Pressable onPress={() => router.replace('/(tabs)')} hitSlop={8} style={[styles.desktopBackBtn, { backgroundColor: colors.textInverse + '26' }]}>
              <Ionicons name="chevron-back" size={18} color={colors.textInverse} />
              <Text style={[styles.desktopBackText, { color: colors.textInverse }]}>Back to Discover</Text>
            </Pressable>
          </View>
          <View style={[styles.desktopCard, { backgroundColor: colors.surface, borderColor: colors.border }, Platform.OS === 'web' ? ({ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' } as object) : null]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.desktopScroll}>
              <View style={[styles.logoRow]}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoCircle}>
                  <Ionicons name="globe-outline" size={30} color="#fff" />
                </LinearGradient>
                <Text style={[styles.brandLabel, { color: colors.textTertiary }]}>CulturePass</Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue your cultural journey.</Text>
              {formFields}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile / tablet: full-screen gradient form ───────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <Head><title>Sign In — CulturePass</title></Head>
        <LinearGradient colors={gradients.culturepassBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.95 }} style={StyleSheet.absoluteFillObject} />

        {/* Top nav bar */}
        <View style={[styles.mobileNav, { paddingTop: topInset + 8 }]}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            hitSlop={12}
            style={[styles.mobileNavBtn, { backgroundColor: colors.textInverse + '25' }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textInverse} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.mobileScroll}
        >
          {/* Logo + heading */}
          <View style={styles.mobileHero}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mobileLogoCircle}>
              <Ionicons name="globe-outline" size={32} color="#fff" />
            </LinearGradient>
            <Text style={[styles.mobileTitle, { color: colors.textInverse }]}>Welcome back</Text>
            <Text style={[styles.mobileSubtitle, { color: colors.textInverse + 'CC' }]}>Sign in to continue your cultural journey</Text>
          </View>

          {/* Form card (frosted glass) */}
          <View style={[styles.mobileCard, { backgroundColor: colors.textInverse + '14', borderColor: colors.textInverse + '30' }]}>
            {formFields}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Mobile ──
  mobileNav:    { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 4 },
  mobileNavBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mobileScroll: { paddingHorizontal: 20, paddingBottom: 48 },
  mobileHero:   { alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
  mobileLogoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  mobileTitle:   { fontSize: 30, fontFamily: 'Poppins_700Bold', color: '#fff', textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  mobileSubtitle:{ fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22 },
  mobileCard:   { borderRadius: 24, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 24 },

  // ── Desktop ──
  desktopWrapper:  { alignItems: 'center', justifyContent: 'center', flex: 1 },
  desktopBackRow:  { position: 'absolute', top: 20, left: 32, zIndex: 10 },
  desktopBackBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  desktopBackText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  desktopCard:     { width: 460, maxHeight: '92%' as unknown as number, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  desktopScroll:   { paddingHorizontal: 32, paddingBottom: 32, paddingTop: 8 },

  // ── Shared branding ──
  logoRow:    { alignItems: 'center', marginBottom: 20, marginTop: 12, gap: 0 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  brandLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.2, marginTop: 10 },
  title:      { fontSize: 28, fontFamily: 'Poppins_700Bold', textAlign: 'center', marginBottom: 6, letterSpacing: -0.3 },
  subtitle:   { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 22, textAlign: 'center', marginBottom: 28 },

  // ── Shared form ──
  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16 },
  errorText: { fontSize: 14, fontFamily: 'Poppins_500Medium', flex: 1 },
  form:          { gap: 18, marginBottom: 24 },
  passwordHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label:         { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  forgotText:    { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  submitBtn:     { marginBottom: 24 },
  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  divLine:       { flex: 1, height: StyleSheet.hairlineWidth },
  divText:       { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  socialRow:     { flexDirection: 'row', gap: 12, marginBottom: 24 },
  switchRow:     { alignItems: 'center', paddingVertical: 4 },
  switchText:    { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  switchLink:    { fontFamily: 'Poppins_700Bold' },
});
