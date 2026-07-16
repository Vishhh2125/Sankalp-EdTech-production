import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';

import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { ROUTES } from '../constants/routes';
import {
  clearRegisterState,
  loginUser,
  registerUser,
} from '../redux/slices/authSlice';
import { API_BASE_URL } from '../constants/config';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import OrDivider from '../components/OrDivider';

function getPasswordStrength(password) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  if (!password) return { level: 0, label: '', color: appTheme.border };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: appTheme.red };
  if (score === 2)
    return { level: 2, label: 'Medium strength', color: appTheme.orange };
  if (score === 3) return { level: 3, label: 'Strong', color: appTheme.green };
  return { level: 4, label: 'Very strong', color: appTheme.green };
}

export default function SignUpScreen({ navigation, onGuestAccess }) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');


  const dispatch = useDispatch();
  const registerStatus = useSelector((state) => state.auth.register.status);
  const registerError = useSelector((state) => state.auth.register.error);
  const registerData = useSelector((state) => state.auth.register.data);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const pendingLoginRef = useRef(null);

  const { promptAsync, loading: googleLoading, googleError } = useGoogleAuth();

  useEffect(() => {
    if (registerStatus === 'succeeded' && registerData?.sessionId) {
      navigation.navigate(ROUTES.OTP, registerData);
      dispatch(clearRegisterState());
    }
  }, [dispatch, navigation, registerData, registerStatus]);

  function handleCreateAccount() {
    const name = fullName.trim();
    const nextEmail = email.trim();

    if (!name) return setLocalError('Please enter your name.');
    if (!nextEmail) return setLocalError('Please enter your email.');
    if (!/^\S+@\S+\.\S+$/.test(nextEmail))
      return setLocalError('Please enter a valid email address.');
    if (!password) return setLocalError('Please enter your password.');

    setLocalError('');
    pendingLoginRef.current = { email: nextEmail, password };
    dispatch(registerUser({ name, email: nextEmail, password }));
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: appTheme.screenBg }]}
      keyboardShouldPersistTaps="always"
    >
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Ionicons name="play" size={16} color={appTheme.white} />
        </View>
        <Text style={styles.logoText}>
          Alpha <Text style={styles.logoPrimary}>Minds</Text>
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>Let's crack it</Text>
      <Text style={styles.subtitle}>Create your free account</Text>

      {/* Name */}
      <Text style={styles.label}>YOUR NAME</Text>
      <TextInput
        value={fullName}
        onChangeText={(t) => {
          setFullName(t);
          if (localError) setLocalError('');
        }}
        placeholder="user name"
        style={styles.input}
        placeholderTextColor={appTheme.darkGray}
      />

      {/* Email */}
      <Text style={styles.label}>EMAIL</Text>
      <TextInput
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (localError) setLocalError('');
        }}
        placeholder="user@example.com"
        style={[styles.input, email.length > 0 && styles.inputActive]}
        placeholderTextColor={appTheme.darkGray}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password */}
      <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
      <View style={styles.passwordWrap}>
        <TextInput
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (localError) setLocalError('');
          }}
          placeholder="Min. 8 characters"
          style={[styles.input, styles.passwordInput]}
          placeholderTextColor={appTheme.darkGray}
          secureTextEntry={!showPassword}
        />
        <Pressable
          style={styles.eyeBtn}
          onPress={() => setShowPassword((p) => !p)}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={appTheme.gray}
          />
        </Pressable>
      </View>

      {/* Strength Bars */}
      {password.length > 0 && (
        <>
          <View style={styles.strengthBars}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      i <= strength.level ? strength.color : appTheme.border,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.strengthLabel, { color: strength.color }]}>
            {strength.label}
          </Text>
        </>
      )}

      {/* Terms */}
      <Text style={styles.terms}>
        By signing up you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>

      {/* Create Account Button */}
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          pressed && styles.actionBtnPressed,
        ]}
        onPress={handleCreateAccount}
        disabled={registerStatus === 'loading'}
      >
        <Text style={styles.actionBtnText}>
          {registerStatus === 'loading' ? 'Creating...' : 'Create account'}
        </Text>
      </Pressable>

      {!!localError && <Text style={styles.errorText}>{localError}</Text>}

      {!!registerError && (
        <Text style={styles.errorText}>
          {String(registerError).includes('Network Error')
            ? `Network Error: cannot reach backend.\nCurrent API_BASE_URL: ${API_BASE_URL}\n\nTips:\n- If backend is on your laptop, keep phone + laptop on same Wi-Fi.\n- If needed, set EXPO_PUBLIC_API_BASE_URL to your laptop IP (example: http://192.168.x.x:5000/api/v1).`
            : registerError}
        </Text>
      )}

      <OrDivider />

      {/* Continue with Google */}
      <Pressable
        disabled={googleLoading || registerStatus === 'loading'}
        style={({ pressed }) => [
          styles.googleBtn,
          pressed && styles.googleBtnPressed,
          (googleLoading || registerStatus === 'loading') && { opacity: 0.6 },
        ]}
        onPress={() => promptAsync()}
      >
        <View style={styles.googleBtnContent}>
          <Ionicons name="logo-google" size={20} color={appTheme.white} style={{ marginRight: 8 }} />
          <Text style={styles.googleBtnText}>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </Text>
        </View>
      </Pressable>

      {/* Google error */}
      {googleError && (
        <Text style={styles.errorText}>{googleError}</Text>
      )}

      {onGuestAccess ? (
        <Pressable
          style={({ pressed }) => [
            styles.guestBtn,
            pressed && styles.guestBtnPressed,
          ]}
          onPress={onGuestAccess}
        >
          <Text style={styles.guestBtnText}>Continue as Guest</Text>
        </Pressable>
      ) : null}

      {/* Sign In Link */}
      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>Already have an account? </Text>
        <Pressable onPress={() => navigation.navigate(ROUTES.LOGIN)}>
          <Text style={styles.bottomLink}>Sign in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const useStyles = (appTheme) => StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: appTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: appTheme.white,
  },
  logoPrimary: {
    color: appTheme.primary,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: appTheme.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: appTheme.gray,
    marginBottom: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: appTheme.gray,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: appTheme.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: appTheme.white,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: appTheme.border,
  },
  inputActive: {
    borderColor: appTheme.primary,
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  terms: {
    fontSize: 13,
    color: appTheme.gray,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  termsLink: {
    color: appTheme.white,
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: appTheme.primary,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  actionBtnPressed: {
    opacity: 0.85,
  },
  actionBtnText: {
    color: appTheme.white,
    fontSize: 17,
    fontWeight: '700',
  },
  googleBtn: {
    backgroundColor: '#4285F4',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  googleBtnPressed: {
    opacity: 0.85,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    color: appTheme.white,
    fontSize: 17,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 12,
    color: appTheme.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  guestBtn: {
    paddingVertical: 12,
    alignSelf: 'center',
    marginTop: 12,
  },
  guestBtnText: {
    color: appTheme.gray,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
  },
  bottomText: {
    color: appTheme.gray,
    fontSize: 14,
  },
  bottomLink: {
    color: appTheme.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
