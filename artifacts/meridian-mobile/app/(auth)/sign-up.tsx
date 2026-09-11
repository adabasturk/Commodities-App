import { useSignUp } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { createStyles } from '@/components/MobilePrimitives';

export default function SignUpScreen() {
  const colors = useColors();
  const styles = createStyles(colors);
  const local = authStyles(colors);
  const insets = useSafeAreaInsets();
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const submit = async () => {
    const result = await signUp.password({ emailAddress: email.trim(), password });
    if (!result.error) await signUp.verifications.sendEmailCode();
  };
  const verify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') await signUp.finalize({ navigate: async () => router.replace('/(tabs)') });
  };
  const verifying = signUp.status === 'missing_requirements' && signUp.unverifiedFields.includes('email_address') && signUp.missingFields.length === 0;

  return <View style={[local.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18 }]}>
    <View style={local.brand}><View style={local.logo}><Text style={local.logoText}>M</Text></View><Text style={styles.eyebrow}>MERIDIAN / COMMODITIES</Text></View>
    <View style={local.form}><Text style={styles.title}>{verifying ? 'Verify your account' : 'Create your account'}</Text><Text style={styles.subtitle}>{verifying ? 'Enter the code sent to your email.' : 'Set up access to the internal desk workspace.'}</Text>
      {verifying ? <><Text style={local.label}>Verification code</Text><TextInput testID="input-verification-code" keyboardType="number-pad" placeholder="123456" placeholderTextColor={colors.mutedForeground} value={code} onChangeText={setCode} style={local.input} /><Pressable testID="button-verify" onPress={verify} disabled={!code || fetchStatus === 'fetching'} style={({ pressed }) => [styles.primaryButton, local.submit, (!code || fetchStatus === 'fetching') && local.disabled, pressed && { opacity: 0.82 }]}><Text style={styles.primaryButtonText}>{fetchStatus === 'fetching' ? 'Verifying…' : 'Verify email'}</Text></Pressable><Pressable onPress={() => signUp.verifications.sendEmailCode()} style={local.resend}><Text style={local.link}>Send a new code</Text></Pressable></> : <><Text style={local.label}>Email address</Text><TextInput testID="input-email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="you@company.com" placeholderTextColor={colors.mutedForeground} value={email} onChangeText={setEmail} style={local.input} /><Text style={local.label}>Password</Text><TextInput testID="input-password" secureTextEntry placeholder="Create a password" placeholderTextColor={colors.mutedForeground} value={password} onChangeText={setPassword} style={local.input} /><Pressable testID="button-sign-up" onPress={submit} disabled={!email || !password || fetchStatus === 'fetching'} style={({ pressed }) => [styles.primaryButton, local.submit, (!email || !password || fetchStatus === 'fetching') && local.disabled, pressed && { opacity: 0.82 }]}><Text style={styles.primaryButtonText}>{fetchStatus === 'fetching' ? 'Creating…' : 'Create account'}</Text></Pressable></>}
      {(errors?.fields?.emailAddress || errors?.fields?.password || errors?.fields?.code) && <Text style={[styles.error, { marginTop: 14 }]}>{errors.fields.emailAddress?.message || errors.fields.password?.message || errors.fields.code?.message}</Text>}
      {!verifying && <View style={local.footer}><Text style={styles.body}>Already have an account?</Text><Link href="/(auth)/sign-in"><Text style={local.link}>Sign in</Text></Link></View>}
      <View nativeID="clerk-captcha" />
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
    resend: { alignItems: 'center', marginTop: 18 },
    footer: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 24 },
    link: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  });
}