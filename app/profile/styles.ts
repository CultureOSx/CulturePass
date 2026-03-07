import { StyleSheet } from 'react-native';
import { Colors, CultureTokens, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  errorText:      { fontSize: 16, fontFamily: 'Poppins_500Medium', color: Colors.textSecondary },
  backButton:     { marginTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: 14, backgroundColor: CultureTokens.indigo },
  backButtonText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.textInverse },

  hero: { paddingBottom: 30, overflow: 'hidden' },

  arcOuter: {
    position: 'absolute', top: -90, right: -90,
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 30, borderColor: CultureTokens.teal + '1A',
  },
  arcInner: {
    position: 'absolute', top: -44, right: -44,
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 20, borderColor: CultureTokens.indigo + '1A',
  },

  heroRingsWm: {
    position: 'absolute',
    bottom: 68,
    left: 16,
  },

  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1, borderColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },

  heroCenter: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },

  avatarGlow: {
    position: 'absolute', top: -20,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: CultureTokens.teal + '1A',
    shadowColor: CultureTokens.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25, shadowRadius: 40,
  },
  avatarGradientRing: {
    width: 104, height: 104, borderRadius: 52,
    padding: Spacing.xs, marginBottom: Spacing.lg,
    shadowColor: CultureTokens.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 18,
    elevation: 12,
  },
  avatarInner: {
    flex: 1, borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 33, color: CultureTokens.teal, letterSpacing: 1,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 74,
    alignSelf: 'center',
    marginLeft: Spacing.lg,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: CultureTokens.teal,
    borderWidth: 3, borderColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: CultureTokens.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7, shadowRadius: 5,
  },

  heroName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26, color: Colors.text,
    textAlign: 'center', letterSpacing: -0.4,
  },
  heroHandle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15, color: Colors.textSecondary,
    marginTop: Spacing.xs, marginBottom: Spacing.lg,
  },

  heroPills: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 8,
  },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
  },
  heroPillAccent: {
    backgroundColor: CultureTokens.teal + '16',
    borderColor: CultureTokens.teal + '35',
  },
  heroPillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.2,
  },

  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22, paddingVertical: 20, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  statsAccentLine: {
    position: 'absolute', top: 0, left: 30, right: 30,
    height: 1.5, opacity: 0.6,
  },
  statItem:  { flex: 1, alignItems: 'center' },
  statNum:   { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#FFF', letterSpacing: -0.5 },
  statLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.textTertiary, marginTop: 3, letterSpacing: 0.4 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },

  tierRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4, gap: 12,
  },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 50, borderWidth: 1.5,
  },
  tierText:        { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  memberSince:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberSinceText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.textTertiary },

  section:       { paddingHorizontal: 20, marginTop: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: CultureTokens.teal },
  sectionTitle:  { fontFamily: 'Poppins_700Bold', fontSize: 18, color: Colors.text, letterSpacing: -0.3 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20, padding: 20,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  bioText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15, color: Colors.textSecondary, lineHeight: 26,
  },

  socialGrid: { gap: 10 },
  socialCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  socialStrip: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3.5, borderRadius: 2,
  },
  socialIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  socialLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.text },

  detailRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailIconWrap:{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailText:    { flex: 1 },
  detailLabel:   { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.textTertiary, letterSpacing: 0.4, marginBottom: 2 },
  detailValue:   { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.text },
  detailDivider: { height: 1, backgroundColor: Colors.background, marginVertical: 16, marginLeft: 60 },

  cpidCard: {
    borderRadius: 24, padding: 24, overflow: 'hidden',
    shadowColor: CultureTokens.indigo,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35, shadowRadius: 28, elevation: 14,
  },
  cpidAccentEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2.5,
  },
  cpidDotsWm: {
    position: 'absolute', bottom: 22, right: 20,
  },
  cpidTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 26,
  },
  cpidLogoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cpidLogoIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  cpidLogoText: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#FFF', letterSpacing: 0.4 },
  cpidVerifiedIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: CultureTokens.teal + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  cpidCenter:    { alignItems: 'center', marginBottom: 26 },
  cpidLabel:     { fontFamily: 'Poppins_500Medium', fontSize: 9, color: Colors.textTertiary, letterSpacing: 4, marginBottom: 8 },
  cpidValue:     { fontFamily: 'Poppins_700Bold', fontSize: 30, color: '#FFF', letterSpacing: 5 },
  cpidUnderline: { width: 160, height: 1.5, marginTop: 10, opacity: 0.65 },

  cpidMeta:      { flexDirection: 'row', marginBottom: 20, gap: 8 },
  cpidMetaItem:  { flex: 1 },
  cpidMetaLabel: {
    fontFamily: 'Poppins_400Regular', fontSize: 9, color: Colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 1.2, marginBottom: 4,
  },
  cpidMetaValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FFF' },

  cpidFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14,
  },
  cpidFooterText: {
    fontFamily: 'Poppins_500Medium', fontSize: 11, color: Colors.textTertiary, letterSpacing: 0.3,
  },

  viewQrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: 18, padding: 16, marginTop: 12,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  viewQrIconWrap: {
    width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  viewQrText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.text },
  viewQrSub:  { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18 },
  backBtn: { padding: 8, borderRadius: 12, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.2 },
  headerAction: { padding: 8, borderRadius: 12, marginLeft: 8 },
  scrollContent: { paddingBottom: 40 },
  cardOuter: { borderRadius: 24, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, margin: 16 },
  cardTop: { padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  cardPattern: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, flexDirection: 'row', justifyContent: 'space-between' },
  patternCircle1: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEE', marginLeft: 8 },
  patternCircle2: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#DDD', marginRight: 8 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoMark: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#222', marginRight: 8 },
  brandName: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.2 },
  brandSub: { fontSize: 12, color: '#888' },
  userSection: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  avatarRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 22, fontWeight: 'bold' },
  userDetails: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: 'bold' },
  userHandle: { fontSize: 13, color: '#AAA' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  metaText: { fontSize: 12, color: '#888' },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CCC', marginHorizontal: 4 },
  qrSection: { padding: 18, backgroundColor: '#F8F8F8', borderRadius: 18, marginTop: 18 },
  qrContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 16, height: 16, borderTopLeftRadius: 8, backgroundColor: '#EEE' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderTopRightRadius: 8, backgroundColor: '#EEE' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 16, height: 16, borderBottomLeftRadius: 8, backgroundColor: '#EEE' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderBottomRightRadius: 8, backgroundColor: '#EEE' },
  qrInner: { padding: 12, backgroundColor: '#FFF', borderRadius: 12 },
  scanLabel: { fontSize: 13, color: '#888', marginTop: 8 },
  cardBottom: { padding: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  bottomDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { fontSize: 13, color: '#2EC4B6', fontWeight: 'bold' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nfcChip: { width: 24, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#CCC', backgroundColor: '#EEE', marginRight: 8 },
  hologram: { width: 32, height: 12, borderRadius: 6, backgroundColor: '#E0E0FF', marginLeft: 8 },
});