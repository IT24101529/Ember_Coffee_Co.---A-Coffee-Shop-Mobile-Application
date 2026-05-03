import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import TopAppBar from '../components/ui/TopAppBar';
import BottomNavBar from '../components/ui/BottomNavBar';
import Input from '../components/ui/Input';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';
import { getProfileTierInfo, LOYALTY_POINTS_CAP } from '../utils/loyaltyTier';

const PLACEHOLDER_AVATAR =
  'https://ui-avatars.com/api/?background=62371E&color=fff&size=128&name=';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, token, login, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isStaff = isAdmin || isManager;

  const [ordersCount, setOrdersCount] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit form state
  const [nameValue, setNameValue]             = useState('');
  const [emailValue, setEmailValue]           = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading]             = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [errors, setErrors]                   = useState({});

  const points   = user?.totalPoints ?? 0;
  const tierInfo = getProfileTierInfo(points);
  const displayPoints = tierInfo.displayPoints;
  const avatarUri = user?.profileImageUrl
    ? user.profileImageUrl
    : PLACEHOLDER_AVATAR + encodeURIComponent(user?.name || 'U');

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(BASE_URL + '/api/auth/profile', {
        headers: { Authorization: 'Bearer ' + token },
      });
      await login(token, data);
    } catch (_) {}
  }, [token]);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(BASE_URL + '/api/orders/my/history', {
        headers: { Authorization: 'Bearer ' + token },
      });
      setOrdersCount(Array.isArray(data) ? data.length : 0);
    } catch (_) { setOrdersCount(0); }
  }, [token]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await Promise.all([fetchProfile(), fetchOrders()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchProfile, fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openEdit = () => {
    setNameValue(user?.name || '');
    setEmailValue(user?.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setEditVisible(true);
  };

  // ── Sign out with confirmation ──────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
    );
  };

  // ── Switch to Admin portal ──────────────────────────────────────────────────
  const handleGoAdmin = () => {
    const isManager = user?.role === 'manager';
    Alert.alert(
      isManager ? 'Switch to Manager Portal' : 'Switch to Admin Portal',
      isManager
        ? 'You are about to enter the Manager portal (Orders & Products).'
        : 'You are about to enter the Admin side of the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => navigation.navigate(isManager ? 'Manager' : 'Admin'),
        },
      ],
    );
  };

  // ── Image picker ───────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('image', { uri: asset.uri, name: asset.fileName || 'profile.jpg', type: asset.mimeType || 'image/jpeg' });
    setUploading(true);
    try {
      const { data } = await axios.post(
        BASE_URL + '/api/auth/profile/upload', formData,
        { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data' } },
      );
      await login(token, data);
    } catch (err) {
      Alert.alert('Upload failed', err.response?.data?.message || 'Could not upload image.');
    } finally { setUploading(false); }
  };

  // ── Save profile edits ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const newErrors = {};
    if (!nameValue.trim()) newErrors.name = 'Name cannot be empty';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue.trim()) newErrors.email = 'Email cannot be empty';
    else if (!emailRegex.test(emailValue.trim())) newErrors.email = 'Enter a valid email';
    if (newPassword) {
      if (!currentPassword) newErrors.currentPassword = 'Enter your current password';
      if (newPassword.length < 8) newErrors.newPassword = 'At least 8 characters';
      if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    setSaving(true);
    try {
      const body = { name: nameValue.trim(), email: emailValue.trim() };
      if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }
      const { data } = await axios.put(BASE_URL + '/api/auth/profile', body, {
        headers: { Authorization: 'Bearer ' + token },
      });
      await login(token, data);
      setEditVisible(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save changes.');
    } finally { setSaving(false); }
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await axios.delete(BASE_URL + '/api/auth/profile', {
                headers: { Authorization: 'Bearer ' + token },
              });
              await logout();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not delete account.');
            } finally { setDeleting(false); }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <TopAppBar title="Profile" />

        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
              {uploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" size="large" />
                </View>
              )}
            </View>
            <Text style={styles.userName}>{user?.name || ''}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>

          {/* Rewards Balance card */}
          <View style={styles.rewardsCard}>
            <Text style={styles.rewardsPoints}>{displayPoints}</Text>
            <Text style={styles.rewardsStarsLabel}>Stars</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: (Math.min(tierInfo.progress, 1) * 100) + '%' }]} />
            </View>
            <View style={styles.tierRow}>
              <Text style={styles.tierName}>{tierInfo.name}</Text>
              {tierInfo.next !== null && (
                <Text style={styles.tierNext}>
                  {tierInfo.next === LOYALTY_POINTS_CAP
                    ? `${tierInfo.next - displayPoints} pts to maximum`
                    : `${tierInfo.next - displayPoints} pts to next tier`}
                </Text>
              )}
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>{'📦'}</Text>
              <Text style={styles.statNumber}>{ordersCount}</Text>
              <Text style={styles.statLabel}>All orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>{'⭐'}</Text>
              <Text style={styles.statNumber}>{tierInfo.name}</Text>
              <Text style={styles.statLabel}>Loyalty Tier</Text>
            </View>
          </View>

          {/* Action list */}
          <View style={styles.actionList}>
            <TouchableOpacity style={styles.actionRow} onPress={openEdit} activeOpacity={0.7}>
              <Text style={styles.actionLabel}>Edit Profile</Text>
              <Text style={styles.actionChevron}>{'›'}</Text>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Orders', { screen: 'OrderHistory' })}
              activeOpacity={0.7}
            >
              <Text style={styles.actionLabel}>Order History</Text>
              <Text style={styles.actionChevron}>{'›'}</Text>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity 
              style={styles.actionRow} 
              activeOpacity={0.7}
              onPress={() => Alert.alert('Coming Soon!', 'Notifications will be available in a future update.')}
            >
              <Text style={styles.actionLabel}>Notifications</Text>
              <Text style={styles.actionChevron}>{'›'}</Text>
            </TouchableOpacity>
          </View>

          {/* Staff portal button — admin and manager only */}
          {isStaff && (
            <TouchableOpacity style={styles.adminBtn} onPress={handleGoAdmin} activeOpacity={0.8}>
              <Text style={styles.adminBtnIcon}>🛠️</Text>
              <Text style={styles.adminBtnText}>
                {isManager ? 'Switch to Manager Portal' : 'Switch to Admin Portal'}
              </Text>
              <Text style={styles.actionChevron}>{'›'}</Text>
            </TouchableOpacity>
          )}

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>

        <BottomNavBar activeTab="Profile" onTabPress={(tab) => navigation.navigate(tab)} />
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Avatar picker */}
              <TouchableOpacity style={styles.avatarPickerRow} onPress={handlePickImage} disabled={uploading} activeOpacity={0.8}>
                <View style={styles.avatarPickerWrapper}>
                  <Image source={{ uri: avatarUri }} style={styles.avatarPickerImg} />
                  {uploading
                    ? <View style={styles.avatarPickerOverlay}><ActivityIndicator color="#fff" /></View>
                    : <View style={styles.avatarPickerOverlay}><Text style={styles.avatarPickerIcon}>📷</Text></View>
                  }
                </View>
                <Text style={styles.avatarPickerLabel}>Change Photo</Text>
              </TouchableOpacity>

              <Text style={styles.sectionLabel}>Account Info</Text>
              <View style={styles.fieldGap}>
                <Input label="Name" placeholder="Your name" value={nameValue}
                  onChangeText={(v) => { setNameValue(v); setErrors((e) => ({ ...e, name: null })); }}
                  error={errors.name} autoCapitalize="words" />
              </View>
              <View style={styles.fieldGap}>
                <Input label="Email" placeholder="your@email.com" value={emailValue}
                  onChangeText={(v) => { setEmailValue(v); setErrors((e) => ({ ...e, email: null })); }}
                  error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>

              <Text style={styles.sectionLabel}>Change Password</Text>
              <Text style={styles.sectionHint}>Leave blank to keep your current password</Text>
              <View style={styles.fieldGap}>
                <Input label="Current Password" placeholder="Enter current password" value={currentPassword}
                  onChangeText={(v) => { setCurrentPassword(v); setErrors((e) => ({ ...e, currentPassword: null })); }}
                  error={errors.currentPassword} secureTextEntry />
              </View>
              <View style={styles.fieldGap}>
                <Input label="New Password" placeholder="Min. 8 characters" value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); setErrors((e) => ({ ...e, newPassword: null })); }}
                  error={errors.newPassword} secureTextEntry />
              </View>
              <View style={styles.fieldGap}>
                <Input label="Confirm New Password" placeholder="Repeat new password" value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: null })); }}
                  error={errors.confirmPassword} secureTextEntry />
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>

              {/* Delete account */}
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.8}>
                {deleting ? <ActivityIndicator color="#E53E3E" size="small" /> : <Text style={styles.deleteBtnText}>Delete Account</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing['4xl'] },

  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatarWrapper: { position: 'relative', width: 128, height: 128, marginBottom: spacing.md },
  avatar: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.accent },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 64,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontFamily: fonts.bold, fontSize: fontSizes['3xl'], color: colors.dark, textAlign: 'center', marginBottom: 4 },
  userEmail: { fontFamily: fonts.regular, fontSize: fontSizes.base, color: 'rgba(46,21,0,0.5)', textAlign: 'center' },

  rewardsCard: { backgroundColor: colors.accent, borderRadius: borderRadius.card, padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center' },
  rewardsPoints: { fontFamily: fonts.extraBold, fontSize: fontSizes['5xl'], color: colors.dark },
  rewardsStarsLabel: { fontFamily: fonts.semiBold, fontSize: fontSizes.md, color: colors.primary, marginBottom: spacing.md },
  progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(98,55,30,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  tierName: { fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.dark },
  tierNext: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: 'rgba(46,21,0,0.6)' },

  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: borderRadius.card, padding: spacing.md, alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 22 },
  statNumber: { fontFamily: fonts.bold, fontSize: fontSizes.xl, color: colors.dark },
  statLabel: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: 'rgba(46,21,0,0.5)' },

  actionList: { backgroundColor: '#FFFFFF', borderRadius: borderRadius.card, marginBottom: spacing.md, overflow: 'hidden' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  actionLabel: { fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: colors.dark },
  actionChevron: { fontSize: 22, color: 'rgba(46,21,0,0.4)', lineHeight: 26 },
  rowDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: spacing.md },

  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  adminBtnIcon: { fontSize: 18 },
  adminBtnText: { flex: 1, fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: '#fff' },

  signOutBtn: { borderWidth: 1.5, borderColor: '#E53E3E', borderRadius: borderRadius.pill, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  signOutText: { fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: '#E53E3E' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing['4xl'], maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  modalTitle: { fontFamily: fonts.bold, fontSize: fontSizes.xl, color: colors.dark },
  modalClose: { fontSize: 18, color: 'rgba(46,21,0,0.5)', padding: 4 },

  avatarPickerRow: { alignItems: 'center', marginBottom: spacing.lg },
  avatarPickerWrapper: { position: 'relative', width: 88, height: 88, marginBottom: spacing.sm },
  avatarPickerImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent },
  avatarPickerOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 44, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatarPickerIcon: { fontSize: 22 },
  avatarPickerLabel: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.primary },

  sectionLabel: { fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.dark, marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionHint: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: 'rgba(46,21,0,0.5)', marginBottom: spacing.sm, marginTop: -4 },
  fieldGap: { marginBottom: spacing.sm },

  saveBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.pill, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  saveBtnText: { fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: '#fff' },

  deleteBtn: { borderWidth: 1.5, borderColor: '#E53E3E', borderRadius: borderRadius.pill, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  deleteBtnText: { fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: '#E53E3E' },
});
