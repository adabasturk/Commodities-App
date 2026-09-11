import { Feather } from '@expo/vector-icons';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { createStyles, Screen, TopBar } from '@/components/MobilePrimitives';

export default function SettingsScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { sessionId } = useAuth();
  return <Screen colors={colors}>
    <TopBar colors={colors} eyebrow="Meridian / workspace" title="Settings" />
    <View style={[styles.card, { paddingVertical: 20 }]}><View style={styles.row}><View style={[styles.smallIcon, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 17 }}>{(user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0] || 'M').toUpperCase()}</Text></View><View style={styles.flex}><Text style={styles.label}>{user?.firstName || 'Meridian operator'}</Text><Text style={[styles.body, { marginTop: 3 }]}>{user?.emailAddresses[0]?.emailAddress}</Text></View><View style={{ alignItems: 'flex-end' }}><Feather name="check-circle" size={16} color="#34d399" /><Text style={[styles.sectionMeta, { marginTop: 4 }]}>Signed in</Text></View></View></View>
    <View style={[styles.card, { marginTop: 8 }]}><Text style={styles.sectionTitle}>Workspace</Text><Text style={[styles.body, { marginTop: 8 }]}>Mobile access is connected to the Meridian desk register. Data is shared with the web workspace.</Text><View style={[styles.row, { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 15, paddingTop: 13 }]}><Text style={[styles.body, styles.flex]}>Session</Text><Text style={styles.mono}>{sessionId ? 'Active' : 'Checking'}</Text></View></View>
    <Pressable testID="button-mobile-sign-out" onPress={() => signOut()} style={({ pressed }) => [styles.outlineButton, { borderColor: colors.destructive, marginTop: 10 }, pressed && { opacity: 0.75 }]}><Text style={{ color: colors.destructive, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Sign out</Text></Pressable>
    <Text style={[styles.sectionMeta, { marginTop: 24, paddingBottom: insets.bottom }]}>Meridian Commodities · desk 04 · 1.0.0</Text>
  </Screen>;
}