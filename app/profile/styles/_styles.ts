export const styles = StyleSheet.create({
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
    position: 'absolute',
    top: -44,
    right: -44,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 16,
    borderColor: CultureTokens.saffron + '1A',
  },
});