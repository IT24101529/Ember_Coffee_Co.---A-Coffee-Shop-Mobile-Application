import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config/api';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import spacing, { borderRadius } from '../../theme/spacing';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const CATEGORIES = ['All', 'Signature Brews', 'Espresso', 'Tea', 'Iced Drinks', 'Pastries'];

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

// Availability badge config
const AVAIL_CONFIG = {
  available:    { label: 'Available',    bg: '#2E7D32', text: '#FFFFFF' },
  outOfStock:   { label: 'Out of Stock', bg: '#D32F2F', text: '#FFFFFF' },
  lowStock:     { label: 'Low Stock',    bg: '#F57C00', text: '#FFFFFF' },
};

function getAvailability(product) {
  if (!product.isAvailable) return 'outOfStock';
  return 'available';
}

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

// ─── Availability Badge ───────────────────────────────────────────────────────
function AvailabilityBadge({ availKey }) {
  const cfg = AVAIL_CONFIG[availKey] || AVAIL_CONFIG.available;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[badgeStyles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    letterSpacing: 0.3,
  },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent }) {
  return (
    <View style={[statStyles.card, accent && statStyles.cardAccent]}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={[statStyles.value, accent && statStyles.valueAccent]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 90,
  },
  cardAccent: {
    backgroundColor: colors.primary,
  },
  icon: { fontSize: 22, marginBottom: spacing.xs },
  value: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['2xl'],
    color: colors.dark,
    marginBottom: 2,
  },
  valueAccent: { color: '#FFFFFF' },
  label: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#8B6A55',
    textAlign: 'center',
  },
});

// ─── Product List Item ────────────────────────────────────────────────────────
function ProductItem({ product, onEdit, onDelete, deleting }) {
  const availKey = getAvailability(product);

  return (
    <View style={[itemStyles.row, deleting && itemStyles.rowDeleting]}>
      {/* Product image 80×80 */}
      {product.productImageUrl ? (
        <Image source={{ uri: product.productImageUrl }} style={itemStyles.image} />
      ) : (
        <View style={[itemStyles.image, itemStyles.imageFallback]}>
          <Text style={itemStyles.imageFallbackIcon}>☕</Text>
        </View>
      )}

      {/* Info */}
      <View style={itemStyles.info}>
        <Text style={itemStyles.name} numberOfLines={1}>{product.productName}</Text>
        <Text style={itemStyles.category} numberOfLines={1}>{product.category}</Text>
        <Text style={itemStyles.price}>Rs. {parseFloat(product.price).toFixed(2)}</Text>
        <AvailabilityBadge availKey={availKey} />
      </View>

      {/* Actions */}
      <View style={itemStyles.actions}>
        <TouchableOpacity
          style={itemStyles.iconBtn}
          onPress={onEdit}
          activeOpacity={0.7}
          disabled={deleting}
        >
          <Text style={itemStyles.iconBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[itemStyles.iconBtn, itemStyles.deleteBtn]}
          onPress={onDelete}
          activeOpacity={0.7}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator size="small" color="#D32F2F" />
            : <Text style={itemStyles.iconBtnText}>🗑️</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  row: {
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
  rowDeleting: { opacity: 0.45 },
  image: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.input,
    resizeMode: 'cover',
    marginRight: spacing.md,
  },
  imageFallback: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackIcon: { fontSize: 28 },
  info: { flex: 1, gap: 3, marginRight: spacing.sm },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  category: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#8B6A55',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
    marginBottom: 2,
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
export default function AdminProductManagementScreen({ navigation }) {
  const { user, token } = useAuth();

  const [products, setProducts]     = useState([]);
  const [promos, setPromos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // ── Fetch all products (including unavailable) ────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [productsRes, promosRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/api/products`, authHeader),
        axios.get(`${BASE_URL}/api/promotions`, authHeader),
      ]);

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.data || []);
      }
      if (promosRes.status === 'fulfilled') {
        setPromos(promosRes.value.data || []);
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    setVisibleCount(PAGE_SIZE);
    fetchData(true);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => !p.isAvailable).length;
  const activePromosCount = promos.filter((p) => {
    if (!p.validUntil) return true;
    return new Date(p.validUntil) > new Date();
  }).length;

  // ── Filtered + paginated products ────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchesSearch = searchQuery
      ? (p.productName || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = activeCategory === 'All'
      ? true
      : (p.category || '').toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  // ── Delete product ────────────────────────────────────────────────────────
  const handleDelete = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.productName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(product._id);
            try {
              await axios.delete(`${BASE_URL}/api/products/${product._id}`, authHeader);
              setProducts((prev) => prev.filter((p) => p._id !== product._id));
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete product.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Navigate to edit ──────────────────────────────────────────────────────
  const handleEdit = (product) => {
    navigation.navigate('AdminAddProduct', { product });
  };

  // ── Navigate to add new ───────────────────────────────────────────────────
  const handleAddNew = () => {
    navigation.navigate('AdminAddProduct', { product: null });
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setVisibleCount(PAGE_SIZE);
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setVisibleCount(PAGE_SIZE);
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

      {/* ── TopAppBar (node 15:1904) ── */}
      <View style={styles.topBar}>
        <View style={{ width: 36 }} />
        <Text style={styles.topBarTitle}>Product Management</Text>
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
        {/* ── Heading + subtitle (node 15:1773) ── */}
        <View style={styles.headingSection}>
          <Text style={styles.heading}>Product Management</Text>
          <Text style={styles.subtitle}>
            Manage your full product catalogue — add, edit, or remove items from the menu.
          </Text>
        </View>

        {/* ── Add New Product button (node 15:1777) ── */}
        <TouchableOpacity style={styles.addBtn} onPress={handleAddNew} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Add New Product</Text>
        </TouchableOpacity>

        {/* ── Search bar ── */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#A0856E"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Category filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          style={styles.chipsScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, activeCategory === cat && styles.chipActive]}
              onPress={() => handleCategoryChange(cat)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Dashboard Stats bento (node 15:1784) ── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="📦"
            label="Total Products"
            value={loading ? '—' : String(totalProducts)}
          />
          <StatCard
            icon="🚫"
            label="Out of Stock"
            value={loading ? '—' : String(outOfStockCount)}
            accent={outOfStockCount > 0}
          />
          <StatCard
            icon="🏷️"
            label="Active Promos"
            value={loading ? '—' : String(activePromosCount)}
          />
        </View>

        {/* ── Product List (node 15:1801) ── */}
        <Text style={styles.sectionTitle}>
          {filteredProducts.length > 0
            ? `Products (${filteredProducts.length})`
            : 'Products'}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☕</Text>
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptyDesc}>Tap "Add New Product" to get started.</Text>
          </View>
        ) : (
          <>
            {visibleProducts.map((product) => (
              <ProductItem
                key={product._id}
                product={product}
                onEdit={() => handleEdit(product)}
                onDelete={() => handleDelete(product)}
                deleting={deletingId === product._id}
              />
            ))}

            {/* ── Load More text button (node 15:1901) ── */}
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
                activeOpacity={0.7}
              >
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Admin BottomNavBar (node 15:1942) ── */}
      <AdminBottomNavBar activeTab="Products" onTabPress={handleTabPress} />
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
  hamburgerIcon: { fontSize: fontSizes.base, color: colors.primary },
  topBarLogo: { fontSize: 18, marginRight: spacing.xs },
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
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#6B5E57',
    lineHeight: 20,
  },

  // Add New Product button
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.dark,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
  },

  // Stats bento
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Section title
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    marginBottom: spacing.md,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.15)',
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  searchClear: { fontSize: 14, color: '#A0856E', paddingLeft: spacing.sm },

  // Category chips
  chipsScroll: { flexGrow: 0, marginBottom: spacing.md },
  chipsContent: { gap: spacing.sm, paddingRight: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.2)',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.dark },
  chipTextActive: { color: '#fff' },

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
  },

  // Load More
  loadMoreBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  loadMoreText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
