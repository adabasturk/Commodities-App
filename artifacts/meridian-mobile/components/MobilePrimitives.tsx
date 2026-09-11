import { Feather } from '@expo/vector-icons';
import type { DashboardSummary, Metrics, Shipment, SupplierSummary } from '@workspace/api-client-react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

type Palette = {
  background: string; foreground: string; card: string; cardForeground: string; primary: string;
  primaryForeground: string; secondary: string; secondaryForeground: string; muted: string;
  mutedForeground: string; accent: string; accentForeground: string; destructive: string;
  destructiveForeground: string; border: string; input: string; radius: number;
};

export function formatMoney(value: number | null | undefined) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatVolume(value: number | null | undefined) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M MT`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K MT`;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)} MT`;
}

export function formatPercent(value: number | null | undefined) {
  return `${(Number(value) || 0).toFixed(1)}%`;
}

export function createStyles(colors: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: 18, paddingBottom: 30 },
    header: { paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    eyebrow: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase' },
    title: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5, marginTop: 5 },
    subtitle: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 5 },
    sectionTitle: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 16 },
    sectionMeta: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    metric: { width: '48.4%', backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, borderWidth: 1, padding: 14 },
    metricLabel: { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
    metricValue: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 21, letterSpacing: -0.5, marginTop: 8 },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, borderWidth: 1, marginBottom: 10, padding: 15 },
    row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    label: { color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 14 },
    body: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
    mono: { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 },
    positive: { color: '#34d399', fontFamily: 'Inter_600SemiBold' },
    warning: { color: '#fbbf24', fontFamily: 'Inter_600SemiBold' },
    negative: { color: colors.destructive, fontFamily: 'Inter_600SemiBold' },
    chip: { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.primary },
    chipText: { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 12 },
    chipTextActive: { color: colors.accentForeground },
    primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: colors.radius, justifyContent: 'center', minHeight: 50, paddingHorizontal: 18 },
    primaryButtonText: { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
    outlineButton: { alignItems: 'center', borderColor: colors.border, borderRadius: colors.radius, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
    outlineButtonText: { color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 14 },
    center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 },
    error: { color: colors.destructive, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
    smallIcon: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  });
}

export function Screen({ children, colors, refreshing, onRefresh }: { children: ReactNode; colors: Palette; refreshing?: boolean; onRefresh?: () => void }) {
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  return <View style={[styles.screen, { paddingTop: insets.top + 18 }]}>
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      showsVerticalScrollIndicator={false}
    >{children}</ScrollView>
  </View>;
}

export function TopBar({ colors, eyebrow, title, action }: { colors: Palette; eyebrow: string; title: string; action?: ReactNode }) {
  const styles = createStyles(colors);
  return <View style={styles.header}><View style={styles.flex}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text></View>{action}</View>;
}

export function MetricGrid({ metrics, colors }: { metrics?: Metrics; colors: Palette }) {
  const styles = createStyles(colors);
  const items = [['Revenue', formatMoney(metrics?.revenue)], ['Profit', formatMoney(metrics?.profit)], ['Volume', formatVolume(metrics?.volumeMt)], ['Margin', formatPercent(metrics?.margin)]];
  return <View style={styles.metrics}>{items.map(([label, value]) => <View key={label} style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, label === 'Profit' && { color: (metrics?.profit || 0) < 0 ? colors.destructive : '#34d399' }]}>{value}</Text></View>)}</View>;
}

export function LoadingState({ colors }: { colors: Palette }) {
  return <View style={createStyles(colors).center}><ActivityIndicator color={colors.primary} size="large" /><Text style={[createStyles(colors).body, { marginTop: 12 }]}>Loading desk data…</Text></View>;
}

export function ErrorState({ colors, retry }: { colors: Palette; retry: () => void }) {
  const styles = createStyles(colors);
  return <View style={styles.center}><Feather name="alert-circle" size={28} color={colors.destructive} /><Text style={[styles.error, { marginTop: 12 }]}>Could not load this view.</Text><Pressable onPress={retry} style={[styles.outlineButton, { marginTop: 18 }]}><Text style={styles.outlineButtonText}>Try again</Text></Pressable></View>;
}

export function ShipmentCard({ item, colors }: { item: Shipment; colors: Palette }) {
  const styles = createStyles(colors);
  return <View style={styles.card}><View style={styles.row}><View style={[styles.smallIcon, { backgroundColor: colors.secondary }]}><Feather name="send" size={17} color={colors.primary} /></View><View style={styles.flex}><Text style={styles.label}>{item.customer}</Text><Text style={[styles.body, { marginTop: 2 }]}>{item.country} · {item.product || 'Fertilizer'}</Text></View><Text style={[styles.positive, { fontSize: 14 }]}>{formatPercent(item.margin)}</Text></View><View style={[styles.row, { marginTop: 13 }]}><Text style={styles.mono}>{item.shipmentDate}</Text><Text style={[styles.mono, styles.flex]}>{formatVolume(item.quantityMt)}</Text><Text style={item.profit < 0 ? styles.negative : styles.positive}>{formatMoney(item.profit)}</Text></View></View>;
}

export function SummaryRow({ label, metrics, colors, icon = 'bar-chart-2' }: { label: string; metrics: Metrics; colors: Palette; icon?: keyof typeof Feather.glyphMap }) {
  const styles = createStyles(colors);
  return <View style={styles.card}><View style={styles.row}><View style={styles.smallIcon}><Feather name={icon} size={17} color={colors.primary} /></View><View style={styles.flex}><Text style={styles.label}>{label}</Text><Text style={[styles.body, { marginTop: 3 }]}>{metrics.shipmentCount} shipments · {formatVolume(metrics.volumeMt)}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={metrics.margin < 0 ? styles.negative : metrics.margin < 12 ? styles.warning : styles.positive}>{formatPercent(metrics.margin)}</Text><Text style={[styles.mono, { marginTop: 3 }]}>{formatMoney(metrics.profit)}</Text></View></View></View>;
}

export type { Palette };