import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config/api';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import spacing, { borderRadius } from '../../theme/spacing';

const ROLES = ['customer', 'manager', 'admin'];

export default function AdminAddUserScreen({ navigation, route }) {
  const { user: authUser, token } = useAuth();
  const existingUser = route?.params?.user ?? null;
  const isEdit = !!existingUser;

  const [name, setName]   = useState(existingUser?.name ?? '');
  const [email, setEmail] = useState(existingUser?.email ?? '');
  const [role, setRole]   = useState(existingUser?.role ?? 'customer');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Validation', 'Name and email are required.');
      return;
    }
    if (!isEdit && password.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(
          `${BASE_URL}/api/auth/users/${existingUser._id}`,
          { name, email, role },
          authHeader
        );
        Alert.alert('Success', 'User updated.');
      } else {
        await axios.post(`${BASE_URL}/api/auth/register`, { name, email, password, role });
        Alert.alert('Success', 'User created.');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* TopAppBar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>User Profile</Text>
        <View style={styles.avatarWrap}>
          {authUser?.profileImageUrl
            ? <Image source={{ uri: authUser.profileImageUrl }} style={styles.avatar} />
            : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{authUser?.name?.[0]?.toUpperCase() || 'A'}</Text>
              </View>
            )
          }
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>User Profile</Text>
        <Text style={styles.subheading}>
          {isEdit ? 'Update the user\'s profile information.' : 'Create a new team member account.'}
        </Text>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jane Doe"
            placeholderTextColor="#BDBDBD"
          />

          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="jane@embercoffee.com"
            placeholderTextColor="#BDBDBD"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {!isEdit && (
            <>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor="#BDBDBD"
                secureTextEntry
              />
            </>
          )}

          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                onPress={() => setRole(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save User'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* System Access info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>System Access</Text>
          {['Admin: full dashboard access', 'Manager: orders & products', 'Customer: app & ordering'].map((line) => (
            <Text key={line} style={styles.infoLine}>• {line}</Text>
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.cream, borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(98,55,30,0.08)', alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  backArrow: { fontSize: fontSizes.lg, color: colors.primary, fontFamily: fonts.bold },
  topBarTitle: { flex: 1, fontFamily: fonts.bold, fontSize: fontSizes.base, color: colors.dark, textAlign: 'center' },
  avatarWrap: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', marginLeft: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.bold, fontSize: fontSizes.sm, color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  heading: { fontFamily: fonts.extraBold, fontSize: fontSizes['2xl'], color: colors.dark, marginBottom: spacing.xs },
  subheading: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: '#6B5E57', lineHeight: 20, marginBottom: spacing.lg },
  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.cardLg,
    padding: spacing.lg, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  fieldLabel: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.dark, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    height: 48, borderRadius: borderRadius.input, borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: spacing.md,
    fontFamily: fonts.regular, fontSize: fontSizes.base, color: colors.dark,
    backgroundColor: colors.cream,
  },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  roleChip: {
    borderRadius: borderRadius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderWidth: 1, borderColor: 'rgba(98,55,30,0.25)', backgroundColor: '#FFFFFF',
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.primary },
  roleChipTextActive: { color: '#FFFFFF' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: borderRadius.pill, borderWidth: 1,
    borderColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: colors.primary },
  saveBtn: {
    flex: 2, height: 48, borderRadius: borderRadius.pill,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: '#FFFFFF' },
  infoCard: {
    backgroundColor: colors.dark, borderRadius: borderRadius.cardLg,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  infoTitle: { fontFamily: fonts.bold, fontSize: fontSizes.base, color: '#FFFFFF', marginBottom: spacing.sm },
  infoLine: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },
});
