import { useSignIn } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { createStyles } from '@/components/MobilePrimitives';

export default function SignInScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const local = authStyles(colors);
  const insets = useSafeAreaInsets();
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    const result = await signIn.password({ emailAddress: email.trim(), password });
    if (result.error) return;
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: async () => router.replace('/(tabs)') });
    }
  };

  return <View style={[local.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18 }]}>
    <View style={local.brand}><View style={local.logo}><Text style={local.logoText}>M</Text></View><Text style={styles.eyebrow}>MERIDIAN / COMMODITIES</Text></View>
    <View style={local.form}><Text style={styles.title}>Welcome back</Text><Text style={styles.subtitle}>Sign in to access your desk workspace.</Text>
      <Text style={local.label}>Email address</Text><TextInput testID="input-email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="you@company.com" placeholderTextColor={colors.mutedForeground} value={email} onChangeText={setEmail} style={local.input} />
      <Text style={local.label}>Password</Text><TextInput testID="input-password" secureTextEntry placeholder="Your password" placeholderTextColor={colors.mutedForeground} value={password} onChangeText={setPassword} style={local.input} />
      {(errors?.fields?.identifier || errors?.fields?.password) && <Text style={styles.error}>{errors.fields.identifier?.message || errors.fields.password?.message}</Text>}
      <Pressable testID="button-sign-in" onPress={submit} disabled={!email || !password || fetchStatus === 'fetching'} style={({ pressed }) => [styles.primaryButton, local.submit, (!email || !password || fetchStatus === 'fetching') && local.disabled, pressed && { opacity: 0.82 }]}><Text style={styles.primaryButtonText}>{fetchStatus === 'fetching' ? 'Signing in…' : 'Continue'}</Text></Pressable>
      <View style={local.footer}><Text style={styles.body}>New to Meridian?</Text><Link href="/(auth)/sign-up"><Text style={local.link}>Create account</Text></Link></View>
    </View>
  </View>;
}

function authStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { backgroundColor: colors.background, flex: 1, paddingHorizontal: 22 },
    brand: { alignItems: 'center', paddingTop: 28 },
    logo: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, height: 56, justifyContent: 'center', marginBottom: 15, width: 56 },
    logoText: { color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 25 },
    form: { flex: 1, justifyContent: 'center' },
    label: { color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 8, marginTop: 21 },
    input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, borderWidth: 1, color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 15, minHeight: 52, paddingHorizontal: 15 },
    submit: { marginTop: 26 },
    disabled: { opacity: 0.45 },
    footer: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 24 },
    link: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  });
}