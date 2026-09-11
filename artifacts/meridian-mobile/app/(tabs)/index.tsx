import { Feather } from '@expo/vector-icons';
import { getGetDashboardSummaryQueryKey, getGetMetadataQueryKey, useGetDashboardSummary, useGetMetadata } from '@workspace/api-client-react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { createStyles, ErrorState, LoadingState, MetricGrid, Screen, SummaryRow, TopBar } from '@/components/MobilePrimitives';

export default function DashboardScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const [year, setYear] = useState<number | undefined>();
  const params = year ? { year } : {};
  const query = useGetDashboardSummary(params, { query: { queryKey: getGetDashboardSummaryQueryKey(params) } });
  const { data: metadata } = useGetMetadata({ query: { queryKey: getGetMetadataQueryKey() } });

  if (query.isLoading) return <LoadingState colors={colors} />;
  if (query.isError) return <ErrorState colors={colors} retry={() => query.refetch()} />;
  const data = query.data;
  const stylesForScreen = createStyles(colors);
  return <Screen colors={colors} refreshing={query.isFetching} onRefresh={() => query.refetch()}>
    <TopBar colors={colors} eyebrow="Meridian / desk pulse" title="Dashboard" action={<View style={{ alignItems: 'flex-end' }}><Feather name="activity" size={19} color={colors.primary} /><Text style={styles.sectionMeta}>Live</Text></View>} />
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
      <Pressable onPress={() => setYear(undefined)} style={[styles.chip, !year && styles.chipActive]}><Text style={[styles.chipText, !year && styles.chipTextActive]}>All time</Text></Pressable>
      {(metadata?.years ?? []).slice(-4).map(item => <Pressable key={item} onPress={() => setYear(item)} style={[styles.chip, year === item && styles.chipActive]}><Text style={[styles.chipText, year === item && styles.chipTextActive]}>{item}</Text></Pressable>)}
    </View>
    <MetricGrid metrics={data?.metrics} colors={colors} />
    <View style={[styles.row, { marginBottom: 12 }]}><Text style={styles.sectionTitle}>Destination markets</Text><Text style={[styles.sectionMeta, styles.flex]}>by country</Text></View>
    {(data?.countries ?? []).slice(0, 6).map(country => <SummaryRow key={country.country} label={country.country} metrics={country} colors={colors} icon="globe" />)}
    {!data?.countries?.length && <Text style={styles.body}>No market data for this view.</Text>}
  </Screen>;
}
