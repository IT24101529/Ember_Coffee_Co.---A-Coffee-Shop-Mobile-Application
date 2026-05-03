import React, { useState, useEffect, useCallback } from 'react';
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

const ROLE_COLORS = {
  admin:    { bg: '#62371E', text: '#FFFFFF' },
  manager:  { bg: '#2E7D32', text: '#FFFFFF' },
  customer: { bg: '#1565C0', text: '#FFFFFF' },
};

const FILTER_OPTIONS = ['All', 'Admin', 'Manager', 'Customer'];

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

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const roleKey = (role || 'customer').toLowerCase();
  const scheme = ROLE_COLORS[roleKey] || ROLE_COLORS.customer;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: scheme.bg }]}>
      <Text style={[badgeStyles.text, { color: scheme.text }]}>
        {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Customer'}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    letterSpacing: 0.3,
  },
});

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({ user: cardUser, onEdit, onDelete, deleting }) {
  const initials = cardUser.name
    ? cardUser.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View style={[cardStyles.card, deleting && cardStyles.cardDeleting]}>
      {/* Avatar */}
      <View style={cardStyles.avatarWrap}>
        {cardUser.profileImageUrl ? (
          <Image source={{ uri: cardUser.profileImageUrl }} style={cardStyles.avatar} />
        ) : (
          <View style={cardStyles.avatarFallback}>
            <Text style={cardStyles.avatarInitials}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={cardStyles.info}>
        <Text style={cardStyles.name} numberOfLines={1}>{cardUser.name || 'Unknown User'}</Text>
        <RoleBadge role={cardUser.role} />
        <Text style={cardStyles.email} numberOfLines={1}>{cardUser.email || ''}</Text>
      </View>

      {/* Actions */}
      <View style={cardStyles.actions}>
        <TouchableOpacity
          style={cardStyles.iconBtn}
          onPress={onEdit}
          activeOpacity={0.7}
          disabled={deleting}
        >
          <Text style={cardStyles.iconBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cardStyles.iconBtn, cardStyles.deleteBtn]}
          onPress={onDelete}
          activeOpacity={0.7}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator size="small" color="#D32F2F" />
            : <Text style={cardStyles.iconBtnText}>🗑️</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDeleting: { opacity: 0.5 },
  avatarWrap: { marginRight: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
  },
  info: { flex: 1, gap: 4, marginRight: spacing.sm },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#6B5E57',
    marginTop: 2,
  },
  actions: { alignItems: 'center', gap: spacing.xs },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.input,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: 'rgba(211,47,47,0.08)' },
  iconBtnText: { fontSize: 15 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminUserManagementScreen({ navigation }) {
  const { user, token } = useAuth();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // ── Fetch all users ───────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/auth/users`, authHeader);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(true);
  };

  // ── Filtered users ────────────────────────────────────────────────────────
  const filteredUsers = activeFilter === 'All'
    ? users
    : users.filter((u) => (u.role || 'customer').toLowerCase() === activeFilter.toLowerCase());

  // ── Delete user ───────────────────────────────────────────────────────────
  const handleDelete = (targetUser) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${targetUser.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(targetUser._id);
            try {
              await axios.delete(`${BASE_URL}/api/auth/users/${targetUser._id}`, authHeader);
              setUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete user.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Navigate to add/edit user ─────────────────────────────────────────────
  const handleEdit = (targetUser) => {
    navigation.navigate('AdminAddUser', { user: targetUser });
  };

  const handleInvite = () => {
    navigation.navigate('AdminAddUser', { user: null });
  };

  // ── Admin tab navigation ──────────────────────────────────────────────────
  const handleTabPress = (tab) => {
    const routeMap = {
      Dashboard:  'AdminDashboard',
      Products:   'AdminProducts',
      Orders:     'AdminOrders',
      Rewards:    'AdminRewards',
      Promotions: 'AdminPromotions',
    };
    const target = routeMap[tab];
    if (target) navigation.navigate(target);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* ── TopAppBar (node 13:1490) ── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Team & Access</Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Heading + description (node 13:1362) ── */}
        <View style={styles.headingSection}>
          <Text style={styles.heading}>Team & Access</Text>
          <Text style={styles.headingDesc}>
            Manage your team members and their access levels. Invite new members or update existing roles.
          </Text>
        </View>

        {/* ── Invite Team Member button (node 13:1367) ── */}
        <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} activeOpacity={0.85}>
          <Text style={styles.inviteBtnText}>+ Invite Team Member</Text>
        </TouchableOpacity>

        {/* ── Filter Bar (node 13:1374) ── */}
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>All Users</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            {FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── User Cards list ── */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyDesc}>
              {activeFilter !== 'All'
                ? `No ${activeFilter} users to display.`
                : 'No user data available.'}
            </Text>
          </View>
        ) : (
          <View style={styles.userList}>
            {filteredUsers.map((u) => (
              <UserCard
                key={u._id || u.email}
                user={u}
                onEdit={() => handleEdit(u)}
                onDelete={() => handleDelete(u)}
                deleting={deletingId === u._id}
              />
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Admin BottomNavBar (node 13:1685) ── */}
      <AdminBottomNavBar activeTab={null} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  // TopAppBar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  hamburgerBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(98,55,30,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  hamburgerIcon: {
    fontSize: fontSizes.base,
    color: colors.primary,
  },
  topBarLogo: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  topBarTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
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

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  // Heading
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

  // Invite button
  inviteBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  inviteBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
  },

  // Filter bar
  filterBar: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterChip: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.2)',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Notice card
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  noticeIcon: { fontSize: 16, lineHeight: 20 },
  noticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.dark,
    lineHeight: 18,
  },

  // User list
  userList: { gap: 0 },

  // Loader
  loader: { marginTop: spacing['3xl'] },

  // Empty state
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
});
