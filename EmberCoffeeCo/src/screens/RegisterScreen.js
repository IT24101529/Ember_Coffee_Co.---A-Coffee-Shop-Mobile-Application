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
  StatusBar,
  Modal,
  Alert,
  Image,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import Input from '../components/ui/Input';
import Divider from '../components/ui/Divider';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateRegisterForm({ name, email, password }) {
  const errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !name.trim()) {
    errors.name = 'Name is required';
  } else if (/[^a-zA-Z\s]/.test(name)) {
    errors.name = 'Name can only contain letters';
  } else if (/\s{2,}/.test(name)) {
    errors.name = 'Name cannot have consecutive spaces';
  }

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

// ─── Inline icon components (text-based, no extra deps) ──────────────────────

function FieldIcon({ children }) {
  return <Text style={iconStyles.icon}>{children}</Text>;
}

const iconStyles = StyleSheet.create({
  icon: { fontSize: 16, color: 'rgba(98,55,30,0.55)' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setApiError('');
    if (!termsAccepted) {
      setErrors((e) => ({ ...e, terms: 'You must agree to the Terms & Conditions' }));
      return;
    }
    const validationErrors = validateRegisterForm({ name, email, password });
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'customer' // Explicitly define user role to fix "role not defined" error
      });
      // Auto-login after successful registration
      const { data } = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: email.trim(),
        password,
      });
      const profileRes = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      await login(data.token, profileRes.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* Decorative coffee bean — bottom-right corner */}
      <View style={styles.beanDecor} pointerEvents="none">
        <View style={styles.beanOuter}>
          <View style={styles.beanInner} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo — horizontal layout */}
          <View style={styles.logoRow}>
            <Image
              source={{ uri: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775206010/black_logo_nualaj.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subtitle}>
              Join the Ember community and start your brew journey
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name field */}
            <Input
              placeholder="Full name"
              value={name}
              onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: null })); }}
              error={errors.name}
              autoCapitalize="words"
              icon={<FieldIcon>👤</FieldIcon>}
            />

            <View style={styles.gap} />

            {/* Email field */}
            <Input
              placeholder="Email address"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<FieldIcon>✉️</FieldIcon>}
            />

            <View style={styles.gap} />

            {/* Password field */}
            <Input
              placeholder="Password (min. 8 characters)"
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
              error={errors.password}
              secureTextEntry={!showPassword}
              icon={<FieldIcon>🔒</FieldIcon>}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeToggle}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              }
            />

            {/* Terms checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => { setTermsAccepted((v) => !v); setErrors((e) => ({ ...e, terms: null })); }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => setTermsVisible(true)}
                >
                  Terms & Conditions
                </Text>
              </Text>
            </TouchableOpacity>
            {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}

            {/* API error */}
            {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

            {/* Create Account button */}
            <View style={styles.buttonGap}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleSubmit}
                  activeOpacity={0.82}
                  disabled={loading}
                >
                  <Text style={styles.createButtonText}>Create Account</Text>
                  <Text style={styles.arrowIcon}>→</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* "or" divider */}
            <Divider label="or" style={styles.divider} />

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Google Sign-In will be available in a future update.')}>
                <Text style={styles.socialText}>🇬 Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Apple Sign-In will be available in a future update.')}>
                <Text style={styles.socialText}> Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <TouchableOpacity
            style={styles.footer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.footerLink}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & Conditions Modal */}
      <Modal visible={termsVisible} animationType="slide" transparent onRequestClose={() => setTermsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setTermsVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.tcMeta}>Last Updated: 2026.04.03</Text>
              <Text style={styles.tcBody}>
                Welcome to Ember Coffee Co. These Terms and Conditions ("Terms") govern your access to and use of the Ember Coffee Co. mobile application (the "App"). By registering for an account, you agree to be bound by these Terms.
              </Text>

              <Text style={styles.tcHeading}>1. User Accounts and Registration</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Eligibility:</Text> You must be at least 14 years old, or the age of legal majority in your jurisdiction, to create an account.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Account Security:</Text> You are responsible for maintaining the confidentiality of your login credentials. You agree to accept responsibility for all activities that occur under your account.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Accuracy of Information:</Text> You agree to provide current, complete, and accurate information during registration and to update your profile as necessary.</Text>

              <Text style={styles.tcHeading}>2. Mobile Ordering and Payments</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Product Availability:</Text> All items are subject to availability. Ember Coffee Co. reserves the right to modify or discontinue any product without notice.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Pricing:</Text> Prices are subject to change. The total amount will be displayed at checkout before you finalize your order.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Order Processing:</Text> Once an order is placed and payment is verified, the status transitions from "Pending" to "Brewing." Orders cannot be canceled once brewing has commenced.</Text>

              <Text style={styles.tcHeading}>3. Loyalty and Rewards Program</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Earning Points:</Text> Customers earn loyalty points based on qualifying purchases. Points hold no cash value.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Redemption:</Text> Points can be redeemed for specific rewards listed in the "My Rewards" section.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Modifications:</Text> Ember Coffee Co. reserves the right to alter points, change rewards, or terminate the loyalty program at any time without prior notice.</Text>

              <Text style={styles.tcHeading}>4. Promotional Codes</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Usage:</Text> Promo Codes must be entered at checkout.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Restrictions:</Text> Promo Codes are valid for a limited time, may be single-use per customer, and cannot be combined with other offers unless explicitly stated.</Text>

              <Text style={styles.tcHeading}>5. User-Generated Content</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Submissions:</Text> The App allows you to post reviews, ratings, and images.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Content Guidelines:</Text> You agree not to upload content that is offensive, defamatory, obscene, or violates intellectual property rights.</Text>
              <Text style={styles.tcBody}><Text style={styles.tcBold}>Rights Granted:</Text> By submitting content, you grant Ember Coffee Co. a non-exclusive, royalty-free right to use, display, and reproduce such content within the App and for promotional purposes.</Text>

              <Text style={styles.tcHeading}>6. Prohibited Conduct</Text>
              <Text style={styles.tcBody}>You agree not to:{'\n'}• Use the App for any illegal or unauthorized purpose.{'\n'}• Attempt to hack, destabilize, or adapt the App's backend infrastructure or API.{'\n'}• Upload files containing viruses, malware, or exceeding the 5MB file size limit.</Text>

              <Text style={styles.tcHeading}>7. Termination</Text>
              <Text style={styles.tcBody}>Ember Coffee Co. reserves the right to suspend or terminate your account at our sole discretion, without notice, for conduct that violates these Terms or is harmful to other users.</Text>

              <Text style={styles.tcHeading}>8. Changes to These Terms</Text>
              <Text style={styles.tcBody}>We may update these Terms from time to time. We will notify you of changes by posting the new Terms on this page and updating the "Last Updated" date.</Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.tcAgreeBtn}
              onPress={() => { setTermsAccepted(true); setTermsVisible(false); setErrors((e) => ({ ...e, terms: null })); }}
              activeOpacity={0.8}
            >
              <Text style={styles.tcAgreeBtnText}>I Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  flex: {
    flex: 1,
  },
  // Decorative bean: two overlapping circles in the bottom-right
  beanDecor: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    zIndex: 0,
  },
  beanOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(98,55,30,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beanInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(98,55,30,0.06)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
  },
  logoRow: {
    marginBottom: spacing['2xl'],
  },
  logoImage: {
    width: 180,
    height: 60,
  },
  headingBlock: {
    marginBottom: spacing.xl,
  },
  heading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['3xl'],
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.primary,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  gap: {
    height: spacing.md,
  },
  eyeToggle: {
    fontSize: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fonts.bold,
    lineHeight: 14,
  },
  termsText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    flex: 1,
  },
  termsLink: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  apiError: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#E53E3E',
    textAlign: 'center',
  },
  buttonGap: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  createButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  createButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  loadingContainer: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    marginBottom: spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  footerLink: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },

  // Terms error
  termsError: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#E53E3E',
    marginTop: -4,
    marginBottom: spacing.sm,
  },

  // T&C Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
  },
  modalClose: {
    fontSize: 18,
    color: 'rgba(46,21,0,0.5)',
    padding: 4,
  },
  modalContent: {
    paddingBottom: spacing.lg,
  },
  tcMeta: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(46,21,0,0.5)',
    marginBottom: spacing.md,
  },
  tcHeading: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.dark,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  tcBody: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  tcBold: {
    fontFamily: fonts.semiBold,
    color: colors.dark,
  },
  tcAgreeBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  tcAgreeBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: '#fff',
  },
});
