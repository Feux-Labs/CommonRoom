import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { AppColors, radius } from '../../theme/tokens';
import { AuthRoute } from '../../types/navigation';

type AuthScreenProps = {
  route: AuthRoute;
  initialName?: string;
  onNavigate: (route: AuthRoute) => void;
  onStartOnboarding: (displayName: string) => void;
  onClose: () => void;
};

export function AuthScreen({ route, initialName, onNavigate, onStartOnboarding, onClose }: AuthScreenProps) {
  const { colors, mode } = useAppTheme();
  const styles = createStyles(colors);
  const [displayName, setDisplayName] = useState(initialName ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'apple'>('email');

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const startSignup = () => {
    if (!displayName.trim() || !validEmail || password.length < 8) {
      setError('Enter your name, a valid email, and a password with at least 8 characters.');
      return;
    }
    setError('');
    onNavigate('otp');
  };

  const attemptEmailSignIn = () => {
    if (!validEmail || !password) {
      setError('Enter a valid email and your password.');
      return;
    }
    setError('');
    setNotice('Email sign-in is not connected in this preview. No account was authenticated.');
  };

  const attemptPasswordReset = () => {
    if (!validEmail) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setNotice('Password reset is not connected in this preview. No reset email was sent.');
  };

  const attemptAppleSignIn = () => {
    setNotice('Apple sign-in is not configured in this preview. No account was authenticated.');
  };

  const goBack = () => {
    if (route === 'otp') {
      onNavigate('sign-up');
    } else if (route === 'forgot-password') {
      onNavigate('login');
    } else {
      onNavigate('welcome');
    }
  };

  const title = {
    welcome: 'Your campus, your people.',
    'sign-up': 'Create your account',
    login: 'Log in',
    otp: 'Verify your email',
    'forgot-password': 'Reset your password',
  }[route];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      <View style={styles.navigation}>
        {route !== 'welcome' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : <View style={styles.backButton} />}
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      <Image
        accessibilityLabel="Common Room logo"
        contentFit="contain"
        source={mode === 'dark'
          ? require('../../../COMMON ROOM full logo white.png')
          : require('../../../COMMON ROOM full logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {route === 'welcome'
          ? 'A shared space for your school community.'
          : route === 'otp'
            ? `Email verification preview for ${email.trim() || 'your email'}.`
            : 'Connect with your campus community.'}
      </Text>

      <View style={styles.panel}>
        <View style={styles.prototypeNote}>
        <Text style={styles.prototypeText}>
          Preview only. Authentication and email delivery are not connected; no account data is sent or saved.
        </Text>
        </View>

      {route === 'welcome' ? (
        <View style={styles.actions}>
          <ActionButton label="Create account with email" onPress={() => onNavigate('sign-up')} colors={colors} />
          <ActionButton label="Sign in with email" onPress={() => onNavigate('login')} colors={colors} secondary />
          <ActionButton label="Continue with Apple" onPress={attemptAppleSignIn} colors={colors} secondary />
        </View>
      ) : null}

      {route === 'sign-up' ? (
        <View style={styles.form}>
          <Field label="Full name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
          <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Create password" value={password} onChangeText={setPassword} secureTextEntry />
          <Text style={styles.helper}>Use at least 8 characters. Your password stays in memory only in this preview.</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <ActionButton label="Preview email OTP step" onPress={startSignup} colors={colors} />
          <Text style={styles.helper}>In the real flow, an email code is sent before account activation.</Text>
          <TextButton label="Already have an account? Sign in" onPress={() => onNavigate('login')} colors={colors} />
        </View>
      ) : null}

      {route === 'login' ? (
        <View style={styles.form}>
          <View style={styles.methodToggle}>
            <MethodButton
              label="Email"
              selected={loginMethod === 'email'}
              onPress={() => { setLoginMethod('email'); setNotice(''); setError(''); }}
              colors={colors}
            />
            <MethodButton
              label="Apple"
              selected={loginMethod === 'apple'}
              onPress={() => { setLoginMethod('apple'); setNotice(''); setError(''); }}
              colors={colors}
            />
          </View>
          {loginMethod === 'email' ? (
            <>
              <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
              {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
              {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
              <ActionButton label="Continue" onPress={attemptEmailSignIn} colors={colors} />
            </>
          ) : (
            <>
              <Text style={styles.helper}>Continue securely with your Apple account.</Text>
              {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
              <ActionButton label="Continue with Apple" onPress={attemptAppleSignIn} colors={colors} />
            </>
          )}
          <TextButton label="Forgot password?" onPress={() => onNavigate('forgot-password')} colors={colors} />
          <TextButton label="Create an account" onPress={() => onNavigate('sign-up')} colors={colors} />
        </View>
      ) : null}

      {route === 'forgot-password' ? (
        <View style={styles.form}>
          <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          <ActionButton label="Request password reset" onPress={attemptPasswordReset} colors={colors} />
        </View>
      ) : null}

      {route === 'otp' ? (
        <View style={styles.form}>
          <Field
            label="6-digit email code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Text style={styles.notice}>
            OTP delivery is not connected, so no code was sent and this preview cannot verify your email.
          </Text>
          <ActionButton
            label="Verify email"
            onPress={() => setNotice('Email verification is unavailable until an auth service is connected.')}
            colors={colors}
            secondary
            disabled
          />
          <ActionButton
            label="Continue to onboarding preview"
            onPress={() => onStartOnboarding(displayName.trim())}
            colors={colors}
          />
          <TextButton label="Back to sign up" onPress={() => onNavigate('sign-up')} colors={colors} />
        </View>
      ) : null}

      {notice && route !== 'login' && route !== 'forgot-password' ? (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>
      ) : null}
      </View>
    </ScrollView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  secureTextEntry?: boolean;
  maxLength?: number;
};

function Field({ label, value, onChangeText, keyboardType = 'default', autoCapitalize, secureTextEntry, maxLength }: FieldProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={colors.textFaint}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  colors: AppColors;
  secondary?: boolean;
  disabled?: boolean;
};

function ActionButton({ label, onPress, colors, secondary = false, disabled = false }: ActionButtonProps) {
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabledButton]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

function TextButton({ label, onPress, colors }: { label: string; onPress: () => void; colors: AppColors }) {
  const styles = createStyles(colors);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textButton}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

function MethodButton({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: AppColors;
}) {
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.methodButton, selected && styles.methodButtonSelected]}
    >
      <Text style={[styles.methodButtonText, selected && styles.methodButtonTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 320,
    paddingBottom: 36,
    paddingHorizontal: 14,
    paddingTop: 54,
    width: '100%',
  },
  navigation: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 20,
    position: 'absolute',
    right: 20,
    top: 10,
    zIndex: 1,
  },
  backButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  backText: {
    color: colors.textMuted,
    fontSize: 26,
    lineHeight: 30,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 22,
  },
  logo: {
    alignSelf: 'center',
    height: 34,
    marginBottom: 10,
    width: 120,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    textAlign: 'center',
  },
  prototypeNote: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    marginBottom: 12,
    padding: 8,
  },
  prototypeText: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
  actions: {
    gap: 8,
    marginTop: 2,
  },
  form: {
    gap: 9,
    marginTop: 2,
  },
  panel: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
    maxWidth: 280,
    padding: 11,
    width: '100%',
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  helper: {
    color: colors.textFaint,
    fontSize: 10,
    lineHeight: 14,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 11,
    lineHeight: 15,
  },
  notice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    padding: 9,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.inverse,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: colors.text,
  },
  methodToggle: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    marginBottom: 3,
    padding: 3,
  },
  methodButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minWidth: 68,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  methodButtonSelected: {
    backgroundColor: colors.text,
  },
  methodButtonText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  methodButtonTextSelected: {
    color: colors.inverse,
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 7,
  },
  textButtonLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
