import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import colors from '../theme/colors';
import { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';

const COFFEE_BG = {
  uri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
};

// Validates email format and password length; returns error strings or null
export function validateLoginForm({ email, password }) {
  const errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return Object.keys(errors).length ? errors : null;
}

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setApiError('');
    const validationErrors = validateLoginForm({ email, password });
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: email.trim(),
        password,
      });
      const profileRes = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      await login(data.token, profileRes.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ImageBackground source={COFFEE_BG} style={styles.bg} resizeMode="cover">
        {/* Dark gradient overlay */}
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo top-left */}
            <View style={styles.logoArea}>
              <Image
                source={{ uri: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775206009/white_logo_d3ma34.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Bottom form section */}
            <View style={styles.formSection}>
              {/* Heading */}
              <Text style={styles.heading}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your brew journey</Text>

              {/* Email field */}
              <View style={styles.fieldGap}>
                <Input
                  placeholder="Email address"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password field */}
              <View style={styles.fieldGap}>
                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
                  error={errors.password}
                  secureTextEntry={!showPassword}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.eyeToggle}>{showPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  }
                />
                <TouchableOpacity
                  style={styles.forgotRow}
                  onPress={() => Alert.alert('Forgot Password', 'Please contact an Admin or visit our nearest shop.')}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* API error */}
              {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

              {/* Sign In button */}
              <View style={styles.buttonGap}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : (
                  <Button
                    variant="primary"
                    title="Sign In"
                    onPress={handleSubmit}
                    disabled={loading}
                  />
                )}
              </View>

              {/* Divider */}
              <View style={styles.dividerGap}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerLabel}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>

              {/* Social buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialButton} onPress={() => Alert.alert('Coming Soon', 'Google Sign-In will be available in a future update.')} activeOpacity={0.7}>
                  <Text style={styles.socialButtonText}>🇬 Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} onPress={() => Alert.alert('Coming Soon', 'Apple Sign-In will be available in a future update.')} activeOpacity={0.7}>
                  <Text style={styles.socialButtonText}> Apple</Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <TouchableOpacity
                style={styles.footer}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.footerText}>
                  Don't have an account?
                  <Text style={styles.footerLink}> Sign up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  bg: {
    flex: 1,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '55%',
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: '42%',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 48,
  },
  logoArea: {
    paddingTop: 180,
    paddingLeft: 90,
  },
  logoImage: {
    width: 230,
    height: 110,
  },
  formSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  heading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['3xl'],
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 28,
  },
  fieldGap: {
    marginBottom: 12,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  forgotText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
  eyeToggle: {
    fontSize: 16,
  },
  apiError: {
    marginBottom: 8,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  buttonGap: {
    marginTop: 8,
    marginBottom: 20,
  },
  loadingContainer: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerGap: {
    marginBottom: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  socialButton: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: 'rgba(255,255,255,0.75)',
  },
  footerLink: {
    fontFamily: fonts.semiBold,
    color: colors.accent,
  },
});
