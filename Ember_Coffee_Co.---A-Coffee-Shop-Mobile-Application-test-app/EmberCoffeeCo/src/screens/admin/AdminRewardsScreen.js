import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  FlatList,
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config/api';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import spacing, { borderRadius } from '../../theme/spacing';

// ─── Constants ────────────────────────────────────────────────────────────────
const ADMIN_TABS = [
  {
    key: 'Dashboard',
    label: 'Dashboard',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210244/dashboard_icon_selected_twkuel.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210249/dashboard_icon_non-selected_f59pd7.png',
  },
  {
    key: 'Products',
    label: 'Products',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/products_icon_selected_mqk0nn.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/products_icon_non-selected_vhus3q.png',
  },
  {
    key: 'Orders',
    label: 'Orders',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210247/orders_icon_selected_lcallq.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210248/orders_icon_non-selected_jtq6bc.png',
  },
  {
    key: 'Rewards',
    label: 'Rewards',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210246/rewards_icon_selected_xb64mi.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210246/rewards_icon_non-selected_a7bi00.png',
  },
  {
    key: 'Promotions',
    label: 'Promos',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/Promos_icon_opd7er.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/Promos_icon_opd7er.png',
  },
];

// ─── Admin BottomNavBar ───────────────────────────────────────────────────────
function AdminBottomNavBar({ activeTab, onTabPress }) {
  return (
    <View style={navStyles.bar}>
      {ADMIN_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={navStyles.tab}
            onPress={() => onTabPress && onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: isActive ? tab.selected : tab.unselected }}
              style={navStyles.icon}
              resizeMode="contain"
            />
            <Text style={[navStyles.label, isActive ? navStyles.labelActive : navStyles.labelInactive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={navStyles.activeDot} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const navStyles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  icon: { width: 24, height: 24 },
  label: { fontFamily: fonts.semiBold, fontSize: 9, marginTop: 3 },
  labelActive: { color: colors.primary },
  labelInactive: { color: '#9E9E9E' },
  activeDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primary, marginTop: 2,
  },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Reward List Item ─────────────────────────────────────────────────────────
function RewardItem({ reward, onEdit, onDelete }) {
  return (
    <View style={styles.rewardItem}>
      {/* Reward image */}
      <View style={styles.rewardImageWrap}>
        {reward.rewardImageUrl ? (
          <Image source={{ uri: reward.rewardImageUrl }} style={styles.rewardImage} />
        ) : (
          <View style={[styles.rewardImage, styles.rewardImagePlaceholder]}>
            <Text style={styles.rewardImagePlaceholderText}>🎁</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.rewardInfo}>
        <Text style={styles.rewardName} numberOfLines={1}>{reward.rewardName}</Text>
        {reward.description ? (
          <Text style={styles.rewardDesc} numberOfLines={2}>{reward.description}</Text>
        ) : null}
        {/* Points badge */}
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsBadgeText}>⭐ {reward.pointsRequired} Stars</Text>
        </View>
      </View>

      {/* Availability dot + actions */}
      <View style={styles.rewardActions}>
        <View style={[styles.availDot, reward.isAvailable ? styles.availDotGreen : styles.availDotGrey]} />
        <TouchableOpacity style={styles.iconBtn} onPress={onEdit} activeOpacity={0.7}>
          <Text style={styles.iconBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onDelete} activeOpacity={0.7}>
          <Text style={styles.iconBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminRewardsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalRewards = rewards.length;
  const totalPointsIssued = rewards.reduce((sum, r) => sum + (r.pointsRequired || 0), 0);
  // Redemption count is not available from GET /api/rewards; show placeholder
  const totalRedemptions = '—';

  // ── Fetch rewards ──────────────────────────────────────────────────────────
  const fetchRewards = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/rewards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRewards(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load rewards.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchRewards(); }, [fetchRewards]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchRewards(true);
  };

  // ── Delete reward ──────────────────────────────────────────────────────────
  const handleDelete = (reward) => {
    Alert.alert(
      'Delete Reward',
      `Are you sure you want to delete "${reward.rewardName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(reward._id);
            try {
              await axios.delete(`${BASE_URL}/api/rewards/${reward._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setRewards((prev) => prev.filter((r) => r._id !== reward._id));
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete reward.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Navigate to add/edit ───────────────────────────────────────────────────
  const handleEdit = (reward) => {
    navigation.navigate('AdminAddReward', { reward });
  };

  const handleAddNew = () => {
    navigation.navigate('AdminAddReward', { reward: null });
  };

  // ── Tab navigation ─────────────────────────────────────────────────────────
  const handleTabPress = (tab) => {
    const routes = {
      Dashboard:  'AdminDashboard',
      Products:   'AdminProducts',
      Orders:     'AdminOrders',
      Rewards:    'AdminRewards',
      Promotions: 'AdminPromotions',
    };
    const target = routes[tab];
    if (target && target !== 'AdminRewards') {
      navigation.navigate(target);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={{ width: 36 }} />
        <Text style={styles.topBarTitle}>Rewards Catalog</Text>
        <View style={styles.avatarWrap}>
          {user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || 'A'}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Heading + description */}
        <View style={styles.headingSection}>
          <Text style={styles.heading}>Rewards Catalog</Text>
          <Text style={styles.headingDesc}>
            Manage your loyalty rewards. Add, edit, or remove rewards that customers can redeem with their stars.
          </Text>
        </View>

        {/* Add New Reward button */}
        <TouchableOpacity style={styles.addBtn} onPress={handleAddNew} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Add New Reward</Text>
        </TouchableOpacity>

        {/* Bento Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="🎁" value={totalRewards} label="Total Rewards" />
          <StatCard icon="🔄" value={totalRedemptions} label="Total Redemptions" />
          <StatCard icon="⭐" value={totalPointsIssued.toLocaleString()} label="Points Issued" />
        </View>

        {/* Reward List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : rewards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyTitle}>No rewards yet</Text>
            <Text style={styles.emptyDesc}>Tap "Add New Reward" to create your first loyalty reward.</Text>
          </View>
        ) : (
          <View style={styles.rewardList}>
            {rewards.map((reward) => (
              <View key={reward._id} style={deletingId === reward._id ? styles.deletingOverlay : null}>
                {deletingId === reward._id && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <RewardItem
                  reward={reward}
                  onEdit={() => handleEdit(reward)}
                  onDelete={() => handleDelete(reward)}
                />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddNew} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* Bottom Nav */}
      <AdminBottomNavBar activeTab="Rewards" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  // ── Top App Bar ──────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(98,55,30,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  backArrow: {
    fontSize: fontSizes.lg,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  topBarTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    textAlign: 'center',
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginLeft: spacing.sm,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: '#FFFFFF',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  // ── Heading ──────────────────────────────────────────────────────────────
  headingSection: { marginBottom: spacing.md },
  heading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['2xl'],
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  headingDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#6B5E57',
    lineHeight: 20,
  },

  // ── Add Button ────────────────────────────────────────────────────────────
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
  },

  // ── Stats Grid ────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: { fontSize: 22, marginBottom: spacing.xs },
  statValue: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.dark,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#9E9E9E',
    textAlign: 'center',
  },

  // ── Reward List ───────────────────────────────────────────────────────────
  rewardList: { gap: spacing.sm },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  rewardImageWrap: {
    marginRight: spacing.md,
  },
  rewardImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.input,
  },
  rewardImagePlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardImagePlaceholderText: { fontSize: 28 },
  rewardInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rewardName: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginBottom: 2,
  },
  rewardDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#6B5E57',
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pointsBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.dark,
  },

  // ── Reward Actions ────────────────────────────────────────────────────────
  rewardActions: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  availDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: spacing.xs,
  },
  availDotGreen: { backgroundColor: '#4CAF50' },
  availDotGrey:  { backgroundColor: '#BDBDBD' },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.input,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 14 },

  // ── Deleting overlay ──────────────────────────────────────────────────────
  deletingOverlay: {
    opacity: 0.5,
  },

  // ── Loader ────────────────────────────────────────────────────────────────
  loader: { marginTop: spacing['3xl'] },

  // ── Empty State ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#9E9E9E',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 76,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
  },
});
