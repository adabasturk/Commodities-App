import { Feather } from '@expo/vector-icons';
import { getListShipmentsQueryKey, useListShipments } from '@workspace/api-client-react';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { createStyles, ErrorState, LoadingState, Screen, ShipmentCard, TopBar } from '@/components/MobilePrimitives';

export default function ShipmentsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const [search, setSearch] = useState('');
  const params = { page: 1, pageSize: 30, search: search || undefined };
  const query = useListShipments(params, { query: { queryKey: getListShipmentsQueryKey(params) } });
  if (query.isLoading) return <LoadingState colors={colors} />;
  if (query.isError) return <ErrorState colors={colors} retry={() => query.refetch()} />;
  return <Screen colors={colors} refreshing={query.isFetching} onRefresh={() => query.refetch()}>
    <TopBar colors={colors} eyebrow="Meridian / shipment register" title="Shipments" />
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, borderWidth: 1, marginBottom: 18, paddingHorizontal: 13 }]}><Feather name="search" size={17} color={colors.mutedForeground} /><TextInput testID="input-shipment-search" value={search} onChangeText={setSearch} placeholder="Search customer, country, vessel…" placeholderTextColor={colors.mutedForeground} style={[styles.flex, { color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 13, minHeight: 48 }]} /><Pressable onPress={() => setSearch('')}><Feather name="x-circle" size={16} color={colors.mutedForeground} /></Pressable></View>
    <View style={[styles.row, { marginBottom: 12 }]}><Text style={styles.sectionTitle}>Latest records</Text><Text style={[styles.sectionMeta, styles.flex]}>{query.data?.total ?? 0} total</Text></View>
    {(query.data?.items ?? []).map(item => <ShipmentCard key={item.id} item={item} colors={colors} />)}
    {!query.data?.items?.length && <View style={styles.center}><Feather name="inbox" size={28} color={colors.mutedForeground} /><Text style={[styles.body, { marginTop: 10 }]}>No shipments match this search.</Text></View>}
  </Screen>;
}