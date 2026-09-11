import { getGetSupplierSummaryQueryKey, useGetSupplierSummary } from '@workspace/api-client-react';
import { Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { createStyles, ErrorState, LoadingState, MetricGrid, Screen, SummaryRow, TopBar } from '@/components/MobilePrimitives';

export default function SummaryScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const query = useGetSupplierSummary({ query: { queryKey: getGetSupplierSummaryQueryKey() } });
  if (query.isLoading) return <LoadingState colors={colors} />;
  if (query.isError) return <ErrorState colors={colors} retry={() => query.refetch()} />;
  const data = query.data;
  return <Screen colors={colors} refreshing={query.isFetching} onRefresh={() => query.refetch()}>
    <TopBar colors={colors} eyebrow="Meridian / supply economics" title="Summary" />
    <MetricGrid metrics={data?.metrics} colors={colors} />
    <View style={[styles.row, { marginBottom: 12 }]}><Text style={styles.sectionTitle}>Supplier contribution</Text><Text style={[styles.sectionMeta, styles.flex]}>all time</Text></View>
    {(data?.suppliers ?? []).map(supplier => <SummaryRow key={supplier.loadingCompany} label={supplier.loadingCompany} metrics={supplier} colors={colors} icon="package" />)}
  </Screen>;
}