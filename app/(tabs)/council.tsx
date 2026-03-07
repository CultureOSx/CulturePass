import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import type {
  CouncilData,
  CouncilAlert,
  CouncilFacility,
  CouncilGrant,
  CouncilLink,
  CouncilPreference,
  CouncilListResponse,
} from '@/lib/api';
import type { EventData } from '@/shared/schema';
import { Button } from '@/components/ui/Button';
import {
  Alert,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCouncil } from '@/hooks/useCouncil';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALERT_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  bushfire: 'Bushfire',
  flood: 'Flood',
  road_closure: 'Road Closures',
  public_meeting: 'Public Meetings',
  grant_opening: 'Grant Openings',
  facility_closure: 'Facility Closures',
  community_notice: 'Community Notices',
  development_application: 'Development Applications',
};

// ---------------------------------------------------------------------------
// Tab entry — route authenticated users to their matched council view,
// guests to the searchable directory.
// ---------------------------------------------------------------------------

export default function CouncilTabScreen() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <CouncilContent /> : <CouncilDirectoryScreen />;
}

// ---------------------------------------------------------------------------
// CouncilContent — "My Council" view (waste, alerts, grants, facilities)
// Shown to authenticated users who have a location set.
// ---------------------------------------------------------------------------

function CouncilContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isError,
    isAuthenticated,
    refetch,
    followMutation,
    prefMutation,
    reminderMutation,
    effectivePrefs,
    togglePref,
  } = useCouncil();

  const councilPhone = data?.council.phone?.trim();
  const councilWebsiteUrl = data?.council.websiteUrl?.trim();

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 0 : insets.top + 12 }]}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading your council...</Text>
          </View>
        ) : isError || !data ? (
          <View style={styles.loadingWrap}>
            <Ionicons name="business-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No council found</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Update your location to auto-match your local council.
            </Text>
            <Button onPress={() => refetch()}>Retry</Button>
            <Button variant="outline" onPress={() => router.push('/(tabs)/council' as never)}>
              Browse Directory
            </Button>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Hero */}
            <View style={[styles.hero, { backgroundColor: colors.surface }]}>
              <View style={styles.heroLeft}>
                <Ionicons name="business" size={26} color={colors.primary} />
                <View>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>{data.council.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: data.council.verificationStatus === 'verified' ? colors.primaryGlow : colors.surface }]}>
                      <Text style={[styles.badgeText, { color: data.council.verificationStatus === 'verified' ? colors.primary : colors.text }]}>
                        {data.council.verificationStatus === 'verified' ? 'Council Verified' : 'Pending Verification'}
                      </Text>
                    </View>
                    <Text style={[styles.heroMeta, { color: colors.textSecondary }]}>
                      {data.council.state} • LGA {data.council.lgaCode}
                    </Text>
                  </View>
                </View>
              </View>
              <Button
                size="sm"
                variant={data.following ? 'secondary' : 'primary'}
                onPress={() => followMutation.mutate()}
                loading={followMutation.isPending}
                disabled={!isAuthenticated}
              >
                {data.following ? 'Following' : 'Follow'}
              </Button>
            </View>

            {/* Council Information */}
            <Section title="Council Information" colors={colors}>
              <InfoRow
                icon="location-outline"
                label={`${data.council.addressLine1 || 'Address unavailable'}, ${data.council.suburb} ${data.council.postcode}`}
                colors={colors}
              />
              <InfoRow
                icon="call-outline"
                label={councilPhone || 'No phone listed'}
                colors={colors}
                onPress={councilPhone ? () => Linking.openURL(`tel:${councilPhone.replace(/\s/g, '')}`) : undefined}
              />
              <InfoRow
                icon="mail-outline"
                label={data.council.email || 'No email listed'}
                colors={colors}
                onPress={data.council.email ? () => Linking.openURL(`mailto:${data.council.email}`) : undefined}
              />
              <InfoRow
                icon="time-outline"
                label={data.council.openingHours || 'Opening hours unavailable'}
                colors={colors}
              />
              <InfoRow
                icon="globe-outline"
                label={councilWebsiteUrl || 'Website unavailable'}
                colors={colors}
                onPress={councilWebsiteUrl ? () => Linking.openURL(councilWebsiteUrl) : undefined}
              />
            </Section>

            {/* Waste & Utilities */}
            <Section title="Waste & Utilities" colors={colors}>
              {data.waste ? (
                <>
                  <Text style={[styles.sectionText, { color: colors.text }]}>
                    General: {data.waste.generalWasteDay} ({data.waste.frequencyGeneral})
                  </Text>
                  <Text style={[styles.sectionText, { color: colors.text }]}>
                    Recycling: {data.waste.recyclingDay} ({data.waste.frequencyRecycling})
                  </Text>
                  {data.waste.greenWasteDay ? (
                    <Text style={[styles.sectionText, { color: colors.text }]}>
                      Green: {data.waste.greenWasteDay} ({data.waste.frequencyGreen || 'schedule varies'})
                    </Text>
                  ) : null}
                  <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                    {data.waste.notes || 'Check your council website for hard waste collection windows.'}
                  </Text>
                </>
              ) : (
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  No waste schedule available for your area.
                </Text>
              )}
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Waste reminder</Text>
                <Switch
                  value={Boolean(data.reminder?.enabled)}
                  onValueChange={(value) => reminderMutation.mutate(value)}
                  disabled={!isAuthenticated || reminderMutation.isPending}
                />
              </View>
            </Section>

            {/* Council Alerts */}
            <Section title="Council Alerts" colors={colors}>
              {effectivePrefs.length > 0 ? (
                <View style={styles.prefGrid}>
                  {effectivePrefs.map((pref: CouncilPreference) => (
                    <Button
                      key={pref.category}
                      size="sm"
                      variant={pref.enabled ? 'primary' : 'outline'}
                      onPress={() => togglePref(pref.category)}
                      disabled={!isAuthenticated || prefMutation.isPending}
                    >
                      {ALERT_LABELS[pref.category] || pref.category}
                    </Button>
                  ))}
                </View>
              ) : (
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  No alert preferences available.
                </Text>
              )}
              {data.alerts.map((alert: CouncilAlert) => (
                <View key={alert.id} style={[styles.alertCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
                  <Text style={[styles.alertBody, { color: colors.textSecondary }]}>{alert.description}</Text>
                  <Text style={[styles.alertMeta, { color: colors.primary }]}>
                    {(ALERT_LABELS[alert.category] || alert.category)} • {alert.severity.toUpperCase()}
                  </Text>
                </View>
              ))}
              {data.alerts.length === 0 ? (
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>No active council alerts.</Text>
              ) : null}
            </Section>

            {/* Council Events */}
            <Section title="Council Events & Activities" colors={colors}>
              {data.events.map((event: EventData) => (
                <View key={event.id} style={[styles.listItem, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.listTitle, { color: colors.text }]}>{event.title}</Text>
                  <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                    {event.city} • {event.date} • {event.time}
                  </Text>
                </View>
              ))}
              {data.events.length === 0 ? (
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>No council events listed yet.</Text>
              ) : null}
            </Section>

            {/* Council Facilities */}
            <Section title="Council Facilities" colors={colors}>
              {data.facilities.map((facility: CouncilFacility) => (
                <View key={String(facility.id)} style={[styles.listItem, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.listTitle, { color: colors.text }]}>{facility.name ?? 'Facility'}</Text>
                  <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                    {facility.category ?? 'Community Facility'}{facility.city ? ` • ${facility.city}` : ''}
                  </Text>
                </View>
              ))}
              {data.facilities.length === 0 ? (
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>No council facilities listed.</Text>
              ) : null}
            </Section>

            {/* Grants */}
            <Section title="Grants" colors={colors}>
              {data.grants.map((grant: CouncilGrant) => (
                <View key={grant.id} style={[styles.listItem, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.listTitle, { color: colors.text }]}>{grant.title}</Text>
                  <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                    {grant.category} • {grant.status.toUpperCase()}
                  </Text>
                  {grant.applicationUrl ? (
                    <Button size="sm" variant="ghost" onPress={() => Linking.openURL(grant.applicationUrl!)}>
                      Apply
                    </Button>
                  ) : null}
                </View>
              ))}
              {data.grants.length === 0 ? (
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>No open grants right now.</Text>
              ) : null}
            </Section>

            {/* Links */}
            <Section title="What's On & Links" colors={colors}>
              {data.links.map((link: CouncilLink) => (
                <Button key={link.id} variant="outline" onPress={() => Linking.openURL(link.url)}>
                  {link.title}
                </Button>
              ))}
              {data.links.length === 0 ? (
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>No council links available.</Text>
              ) : null}
            </Section>

            {/* Browse directory CTA */}
            <Pressable
              style={[styles.directoryBtn, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '30' }]}
              onPress={() => router.push({ pathname: '/council/[id]', params: { id: data.council.id } })}
              accessibilityRole="button"
              accessibilityLabel="View full council profile"
            >
              <Ionicons name="business-outline" size={16} color={colors.primary} />
              <Text style={[styles.directoryBtnText, { color: colors.primary }]}>View Full Council Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
          </ScrollView>
        )}
      </View>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// CouncilDirectoryScreen — searchable list of all AU councils
// Shown to guests, and linked from CouncilContent.
// ---------------------------------------------------------------------------

function CouncilDirectoryScreen() {
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery<CouncilListResponse>({
    queryKey: ['/api/council/list', search, page],
    queryFn: () =>
      api.council.list({
        q: search,
        sortBy: 'name',
        sortDir: 'asc',
        verificationStatus: 'verified',
        page,
        pageSize: 30,
      }),
  });

  const councils = data?.councils ?? [];
  const hasNextPage = data?.hasNextPage ?? false;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: topInset }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24, gap: 16 }}
    >
      <Text style={{ fontSize: 28, fontFamily: 'Poppins_700Bold', color: colors.text, marginBottom: 4 }}>
        Council Directory
      </Text>
      <TextInput
        value={search}
        onChangeText={(text) => { setSearch(text); setPage(1); }}
        placeholder="Search councils by name or suburb..."
        placeholderTextColor={colors.textTertiary}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 12,
          fontSize: 15,
          fontFamily: 'Poppins_400Regular',
          color: colors.text,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.borderLight,
        }}
        accessibilityLabel="Search councils"
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : error ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
          <Text style={{ fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: colors.text }}>
            Could not load councils
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 14 }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading councils"
          >
            <Text style={{ fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: colors.textInverse }}>
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : null}

      {councils.map((council) => (
        <CouncilCard key={String(council.id)} council={council} isAuthenticated={isAuthenticated} colors={colors} />
      ))}

      {councils.length === 0 && !isLoading && !error && (
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
          <Ionicons name="business-outline" size={44} color={colors.textSecondary} />
          <Text style={{ fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: colors.text }}>No councils found</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {page > 1 && (
          <Button onPress={() => setPage(page - 1)} style={{ flex: 1 }}>Previous</Button>
        )}
        {hasNextPage && (
          <Button onPress={() => setPage(page + 1)} style={{ flex: 1 }}>Load More</Button>
        )}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// CouncilCard
// ---------------------------------------------------------------------------

type CouncilCardProps = {
  council: CouncilData;
  isAuthenticated: boolean;
  colors: ReturnType<typeof useColors>;
};

function CouncilCard({ council, isAuthenticated, colors }: CouncilCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [isClaimSubmitting, setIsClaimSubmitting] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimRole, setClaimRole] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [claimStatus, setClaimStatus] = useState('');
  const isVerified = council.verificationStatus === 'verified';

  const handleFollow = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Please sign in to follow councils.');
      return;
    }
    try {
      await api.council.follow(council.id);
      Alert.alert('Following', `You are now following ${council.name}.`);
    } catch {
      Alert.alert('Error', 'Could not follow council. Please try again.');
    }
  };

  const handleClaim = async () => {
    setIsClaimSubmitting(true);
    try {
      await api.council.claim(council.id, { workEmail: claimEmail, roleTitle: claimRole, note: claimNote });
      setClaimStatus('Claim submitted!');
    } catch {
      setClaimStatus('Error submitting claim. Please try again.');
    }
    setIsClaimSubmitting(false);
  };

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/council/[id]', params: { id: council.id } })}
      style={({ pressed }) => [{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
        opacity: pressed ? 0.92 : 1,
      }]}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${council.name} council`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="business" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontFamily: 'Poppins_700Bold', color: colors.text }} numberOfLines={2}>
              {council.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: isVerified ? colors.success + '20' : colors.surface }}>
                <Text style={{ fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: isVerified ? colors.success : colors.textSecondary }}>
                  {isVerified ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Button onPress={handleFollow} size="sm" disabled={!isAuthenticated}>
          {isAuthenticated ? 'Follow' : 'Sign in'}
        </Button>
      </View>

      <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 13, fontFamily: 'Poppins_400Regular' }}>
        {[council.state, council.suburb, council.country].filter(Boolean).join(' · ')}
      </Text>

      {council.description ? (
        <Text style={{ color: colors.textSecondary, marginBottom: 10, fontSize: 13, fontFamily: 'Poppins_400Regular' }} numberOfLines={2}>
          {council.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {council.websiteUrl ? (
          <Pressable
            onPress={() => Linking.openURL(council.websiteUrl as string)}
            accessibilityRole="link"
            accessibilityLabel={`Visit ${council.name} website`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Ionicons name="globe-outline" size={14} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 13, fontFamily: 'Poppins_500Medium' }}>Website</Text>
          </Pressable>
        ) : null}
        {council.email ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${council.email}`)}
            accessibilityRole="link"
            accessibilityLabel={`Email ${council.name}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Ionicons name="mail-outline" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontFamily: 'Poppins_500Medium' }}>Email</Text>
          </Pressable>
        ) : null}
        {council.phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${council.phone}`)}
            accessibilityRole="link"
            accessibilityLabel={`Call ${council.name}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Ionicons name="call-outline" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontFamily: 'Poppins_500Medium' }}>{council.phone}</Text>
          </Pressable>
        ) : null}
        {council.lgaCode ? (
          <Text style={{ color: colors.textTertiary, fontSize: 12, fontFamily: 'Poppins_400Regular' }}>
            LGA: {council.lgaCode}
          </Text>
        ) : null}
        {council.postcode ? (
          <Text style={{ color: colors.textTertiary, fontSize: 12, fontFamily: 'Poppins_400Regular' }}>
            {council.postcode}
          </Text>
        ) : null}
      </View>

      <Button onPress={() => setShowDetails((v) => !v)} variant="outline" size="sm" style={{ marginBottom: 8 }}>
        {showDetails ? 'Hide Details' : 'Show Details'}
      </Button>

      {showDetails && (
        <View style={{ marginTop: 10, gap: 12 }}>
          <Text style={{ fontFamily: 'Poppins_700Bold', color: colors.text, fontSize: 15 }}>Events & Info</Text>
          <CouncilEvents councilId={council.id} colors={colors} />
          <CouncilAlerts councilId={council.id} colors={colors} />
          <CouncilFacilities councilId={council.id} colors={colors} />
          <CouncilGrants councilId={council.id} colors={colors} />
          <CouncilLinks councilId={council.id} colors={colors} />
          <Button onPress={() => setShowClaimForm((v) => !v)} variant="ghost" size="sm">
            {showClaimForm ? 'Cancel Claim' : 'Claim this Council'}
          </Button>
          {showClaimForm && (
            <View style={{ gap: 8 }}>
              <TextInput
                value={claimEmail}
                onChangeText={setClaimEmail}
                placeholder="Work Email"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Work email for council claim"
                style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 10, fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.text, borderWidth: 1, borderColor: colors.borderLight }}
              />
              <TextInput
                value={claimRole}
                onChangeText={setClaimRole}
                placeholder="Role Title"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Role title for council claim"
                style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 10, fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.text, borderWidth: 1, borderColor: colors.borderLight }}
              />
              <TextInput
                value={claimNote}
                onChangeText={setClaimNote}
                placeholder="Note (optional)"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Optional note for council claim"
                style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 10, fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.text, borderWidth: 1, borderColor: colors.borderLight }}
              />
              <Button onPress={handleClaim} loading={isClaimSubmitting}>Submit Claim</Button>
              {claimStatus ? (
                <Text style={{ color: claimStatus.startsWith('Error') ? colors.error : colors.success, fontFamily: 'Poppins_500Medium', fontSize: 13 }}>
                  {claimStatus}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Council sub-section components (used in CouncilCard's expanded view)
// ---------------------------------------------------------------------------

function CouncilEvents({ councilId, colors }: { councilId: string; colors: ReturnType<typeof useColors> }) {
  const { data, isLoading } = useQuery<EventData[]>({
    queryKey: ['/api/council/events', councilId],
    queryFn: () => api.council.events(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color={colors.primary} />;
  if (!data || data.length === 0) {
    return <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Poppins_400Regular' }}>No events found.</Text>;
  }
  return (
    <View style={{ gap: 6 }}>
      {data.map((event) => (
        <View key={event.id} style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.borderLight }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: colors.text, fontSize: 13 }}>{event.title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Poppins_400Regular' }}>
            {event.date} · {event.city}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CouncilAlerts({ councilId, colors }: { councilId: string; colors: ReturnType<typeof useColors> }) {
  const { data, isLoading } = useQuery<CouncilAlert[]>({
    queryKey: ['/api/council/alerts', councilId],
    queryFn: () => api.council.alerts(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color={colors.primary} />;
  if (!data || data.length === 0) {
    return <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Poppins_400Regular' }}>No alerts found.</Text>;
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: 'Poppins_700Bold', color: colors.text, fontSize: 13 }}>Alerts</Text>
      {data.map((alert) => (
        <View key={alert.id} style={{ backgroundColor: colors.warning + '15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.warning + '30' }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: colors.warning, fontSize: 13 }}>{alert.title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Poppins_400Regular' }}>
            {alert.category} · {alert.severity}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CouncilFacilities({ councilId, colors }: { councilId: string; colors: ReturnType<typeof useColors> }) {
  const { data, isLoading } = useQuery<CouncilFacility[]>({
    queryKey: ['/api/council/facilities', councilId],
    queryFn: () => api.council.facilities(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color={colors.primary} />;
  if (!data || data.length === 0) {
    return <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Poppins_400Regular' }}>No facilities found.</Text>;
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: 'Poppins_700Bold', color: colors.text, fontSize: 13 }}>Facilities</Text>
      {data.map((facility) => (
        <View key={facility.id} style={{ backgroundColor: colors.info + '10', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.info + '25' }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: colors.text, fontSize: 13 }}>{facility.name ?? 'Facility'}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Poppins_400Regular' }}>{facility.category ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}

function CouncilGrants({ councilId, colors }: { councilId: string; colors: ReturnType<typeof useColors> }) {
  const { data, isLoading } = useQuery<CouncilGrant[]>({
    queryKey: ['/api/council/grants', councilId],
    queryFn: () => api.council.grants(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color={colors.primary} />;
  if (!data || data.length === 0) {
    return <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Poppins_400Regular' }}>No grants found.</Text>;
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: 'Poppins_700Bold', color: colors.text, fontSize: 13 }}>Grants</Text>
      {data.map((grant) => (
        <View key={grant.id} style={{ backgroundColor: colors.gold + '10', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.gold + '30' }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: colors.gold, fontSize: 13 }}>{grant.title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Poppins_400Regular' }}>{grant.category}</Text>
        </View>
      ))}
    </View>
  );
}

function CouncilLinks({ councilId, colors }: { councilId: string; colors: ReturnType<typeof useColors> }) {
  const { data, isLoading } = useQuery<CouncilLink[]>({
    queryKey: ['/api/council/links', councilId],
    queryFn: () => api.council.links(councilId),
  });
  if (isLoading) return <ActivityIndicator size="small" color={colors.primary} />;
  if (!data || data.length === 0) {
    return <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Poppins_400Regular' }}>No links found.</Text>;
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: 'Poppins_700Bold', color: colors.text, fontSize: 13 }}>Links</Text>
      {data.map((link) => (
        <Pressable
          key={link.id}
          onPress={() => Linking.openURL(link.url)}
          accessibilityRole="link"
          accessibilityLabel={link.title}
        >
          <Text style={{ color: colors.info, fontSize: 13, fontFamily: 'Poppins_500Medium', textDecorationLine: 'underline' }}>
            {link.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared section wrappers
// ---------------------------------------------------------------------------

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text
        onPress={onPress}
        style={[styles.infoText, { color: onPress ? colors.primary : colors.text }]}
        accessibilityRole={onPress ? 'link' : 'text'}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  loadingText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  hero: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroLeft: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  heroTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  heroMeta: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  section: { borderRadius: 14, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  sectionBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_500Medium' },
  sectionText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  sectionHint: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  switchLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  prefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  alertCard: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 5 },
  alertTitle: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  alertBody: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  alertMeta: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  listItem: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  listTitle: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  listSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  directoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    marginTop: 4,
  },
  directoryBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
});
