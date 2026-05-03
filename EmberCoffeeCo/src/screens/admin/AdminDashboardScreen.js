import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config/api';
import { BRAND_LOGO_URI } from '../../components/ui/TopAppBar';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import spacing, { borderRadius } from '../../theme/spacing';

// ─── Admin BottomNavBar (admin variant) ──────────────────────────────────────
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
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  icon: { width: 24, height: 24 },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    marginTop: 3,
  },
  labelActive: { color: colors.primary },
  labelInactive: { color: '#9E9E9E' },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, description, trend, linkLabel, onLinkPress, icon }) {
  return (
    <View style={styles.statCard}>
      {icon ? (
        <Text style={styles.statIcon}>{icon}</Text>
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
      <Text style={styles.statTitle}>{title}</Text>
      {description ? <Text style={styles.statDesc}>{description}</Text> : null}
      {trend ? (
        <View style={styles.trendRow}>
          <Text style={styles.trendArrow}>↑</Text>
          <Text style={styles.trendLabel}>{trend}</Text>
        </View>
      ) : null}
      {linkLabel ? (
        <TouchableOpacity onPress={onLinkPress} style={styles.statLink}>
          <Text style={styles.statLinkText}>{linkLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }) {
  return (
    <View style={styles.productCard}>
      {/* Image with availability badge */}
      <View style={styles.productImageWrap}>
        {product.productImageUrl ? (
          <Image source={{ uri: product.productImageUrl }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Text style={styles.productImagePlaceholderText}>☕</Text>
          </View>
        )}
        <View style={[
          styles.availBadge,
          product.isAvailable ? styles.availBadgeOn : styles.availBadgeOff,
        ]}>
          <Text style={styles.availBadgeText}>
            {product.isAvailable ? 'Available' : 'Unavailable'}
          </Text>
        </View>
      </View>

      {/* Info row */}
      <View style={styles.productInfo}>
        <View style={styles.productMeta}>
          <Text style={styles.productName} numberOfLines={1}>{product.productName}</Text>
          <Text style={styles.productPrice}>Rs. {parseFloat(product.price).toFixed(2)}</Text>
        </View>
        {product.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
        ) : null}

        {/* Action buttons */}
        <View style={styles.productActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(product)} activeOpacity={0.8}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(product)} activeOpacity={0.8}>
            <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Signature Brews', 'Espresso', 'Tea', 'Iced Drinks', 'Pastries'];

export default function AdminDashboardScreen({ navigation }) {
  const { user, token } = useAuth();

  const [promos, setPromos]               = useState([]);
  const [storeReviews, setStoreReviews]   = useState([]);
  const [productReviews, setProductReviews] = useState([]);
  const [orders, setOrders]               = useState([]);
  const [products, setProducts]           = useState([]);
  const [loading, setLoading]             = useState(true);

  // Review filter state: 'store' (default) or 'product'
  const [reviewFilter, setReviewFilter]   = useState('store');
  // Product name filter for product reviews
  const [productFilter, setProductFilter] = useState('All');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Guard: non-admin
  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.notAuthText}>Admin access required.</Text>
      </SafeAreaView>
    );
  }

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [promosRes, storeRevRes, prodRevRes, ordersRes, productsRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/api/promotions`, authHeader),
        axios.get(`${BASE_URL}/api/store-reviews`),
        axios.get(`${BASE_URL}/api/reviews`, authHeader),
        axios.get(`${BASE_URL}/api/orders`, authHeader),
        axios.get(`${BASE_URL}/api/products`, authHeader),
      ]);
      if (promosRes.status === 'fulfilled')   setPromos(promosRes.value.data || []);
      if (storeRevRes.status === 'fulfilled') setStoreReviews(storeRevRes.value.data || []);
      if (prodRevRes.status === 'fulfilled')  setProductReviews(prodRevRes.value.data || []);
      if (ordersRes.status === 'fulfilled')   setOrders(ordersRes.value.data || []);
      if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  // Derived stats
  const activeOrders    = orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Brewing').length;
  const activePromos    = promos.filter((p) => p.isActive !== false && new Date(p.validUntil) > new Date()).length;
  const totalInventory  = products.length;

  const handleSwitchToCustomer = () => {
    Alert.alert(
      'Switch to Customer Side',
      'Go back to the customer view of the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: () => navigation.navigate('Home') },
      ],
    );
  };

  const handleAdminTabPress = (tab) => {
    const routeMap = {
      Dashboard:  'AdminDashboard',
      Products:   'AdminProducts',
      Orders:     'AdminOrders',
      Rewards:    'AdminRewards',
      Promotions: 'AdminPromotions',
    };
    const route = routeMap[tab];
    if (route && route !== 'AdminDashboard') navigation.navigate(route);
  };

  const handleDeleteStoreReview = (id) => {
    Alert.alert('Delete Review', 'Remove this store review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${BASE_URL}/api/store-reviews/${id}`, authHeader);
            setStoreReviews((prev) => prev.filter((r) => r._id !== id));
          } catch { Alert.alert('Error', 'Could not delete review.'); }
        },
      },
    ]);
  };

  const handleDeleteProductReview = (id) => {
    Alert.alert('Delete Review', 'Remove this product review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${BASE_URL}/api/reviews/${id}`, authHeader);
            setProductReviews((prev) => prev.filter((r) => r._id !== id));
          } catch { Alert.alert('Error', 'Could not delete review.'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <Image source={{ uri: BRAND_LOGO_URI }} style={styles.topBarLogo} resizeMode="contain" />
        <TouchableOpacity style={styles.customerToggleBtn} onPress={handleSwitchToCustomer} activeOpacity={0.8}>
          <Text style={styles.customerToggleText}>☕ Customer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.dashHeading}>Dashboard</Text>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard title="Total Inventory" value={totalInventory} description="Products in catalogue" />
              <StatCard title="Active Orders" value={activeOrders} trend="Live orders" />
            </View>
            <View style={styles.statsRow}>
              <StatCard title="Active Promos" value={activePromos} linkLabel="Manage Promos" onLinkPress={() => navigation.navigate('AdminPromotions')} />
              <StatCard title="Team & Access" icon="👥" description="Manage your team" linkLabel="Manage Team" onLinkPress={() => navigation.navigate('AdminUserManagement')} />
            </View>
          </View>
        )}

        {/* Active Promotions Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionCardTitle}>🏷️  Active Promotions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminPromotions')} activeOpacity={0.7}>
              <Text style={styles.sectionCardLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          {promos.filter(p => p.isActive !== false && new Date(p.validUntil) > new Date()).length === 0 ? (
            <Text style={styles.emptyText}>No active promotions.</Text>
          ) : (
            promos.filter(p => p.isActive !== false && new Date(p.validUntil) > new Date()).map((promo) => (
              <View key={promo._id} style={styles.promoRow}>
                <View style={styles.promoCodePill}>
                  <Text style={styles.promoCodeText}>{promo.promoCode}</Text>
                </View>
                <Text style={styles.promoDiscount}>{promo.discountPercent}% off</Text>
                <Text style={styles.promoExpiry}>
                  Exp. {new Date(promo.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ── Customer Reviews Section ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionCardTitle}>📝  Customer Reviews</Text>
            <Text style={styles.sectionCardCount}>
              {reviewFilter === 'store' ? storeReviews.length : productReviews.length} total
            </Text>
          </View>

          {/* ── Quick Filter Tabs ── */}
          <View style={styles.reviewFilterRow}>
            <TouchableOpacity
              style={[
                styles.reviewFilterTab,
                reviewFilter === 'store' && styles.reviewFilterTabActive,
              ]}
              onPress={() => { setReviewFilter('store'); setProductFilter('All'); setProductDropdownOpen(false); }}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.reviewFilterTabText,
                reviewFilter === 'store' && styles.reviewFilterTabTextActive,
              ]}>⭐ Store Reviews</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.reviewFilterTab,
                reviewFilter === 'product' && styles.reviewFilterTabActive,
              ]}
              onPress={() => { setReviewFilter('product'); setProductDropdownOpen(false); }}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.reviewFilterTabText,
                reviewFilter === 'product' && styles.reviewFilterTabTextActive,
              ]}>☕ Product Reviews</Text>
            </TouchableOpacity>
          </View>

          {/* ── Product Name Dropdown (only when product filter active) ── */}
          {reviewFilter === 'product' && (() => {
            const reviewedProductNames = [...new Set(
              productReviews
                .map(r => r.productId?.productName)
                .filter(Boolean)
            )].sort();
            const dropdownOptions = ['All', ...reviewedProductNames];
            return (
              <View style={styles.productDropdownWrap}>
                <TouchableOpacity
                  style={styles.productDropdownTrigger}
                  onPress={() => setProductDropdownOpen(o => !o)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.productDropdownTriggerText}>
                    {productFilter === 'All' ? 'All Products' : productFilter}
                  </Text>
                  <Text style={styles.productDropdownChevron}>
                    {productDropdownOpen ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {productDropdownOpen && (
                  <View style={styles.productDropdownMenu}>
                    {dropdownOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.productDropdownOption,
                          productFilter === opt && styles.productDropdownOptionActive,
                        ]}
                        onPress={() => { setProductFilter(opt); setProductDropdownOpen(false); }}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.productDropdownOptionText,
                          productFilter === opt && styles.productDropdownOptionTextActive,
                        ]}>
                          {opt === 'All' ? 'All Products' : opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })()}

          {/* ── Store Reviews List ── */}
          {reviewFilter === 'store' && (
            storeReviews.length === 0 ? (
              <Text style={styles.emptyText}>No store reviews yet.</Text>
            ) : (
              storeReviews.map((review) => (
                <View key={review._id} style={styles.reviewRow}>
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewerName}>{review.userId?.name || 'Anonymous'}</Text>
                    <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                    {review.comment ? <Text style={styles.reviewComment} numberOfLines={2}>{review.comment}</Text> : null}
                    {review.reviewImageUrl ? (
                      <Image source={{ uri: review.reviewImageUrl }} style={styles.reviewListImage} />
                    ) : null}
                  </View>
                  <TouchableOpacity style={styles.deleteReviewBtn} onPress={() => handleDeleteStoreReview(review._id)} activeOpacity={0.7}>
                    <Text style={styles.deleteReviewIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )
          )}

          {/* ── Product Reviews List ── */}
          {reviewFilter === 'product' && (() => {
            const filteredProductReviews = productFilter === 'All'
              ? productReviews
              : productReviews.filter(r => r.productId?.productName === productFilter);
            return filteredProductReviews.length === 0 ? (
              <Text style={styles.emptyText}>
                {productFilter === 'All' ? 'No product reviews yet.' : `No reviews for "${productFilter}".`}
              </Text>
            ) : (
              filteredProductReviews.map((review) => (
                <View key={review._id} style={styles.reviewRow}>
                  <View style={styles.reviewInfo}>
                    <View style={styles.reviewHeaderRow}>
                      <Text style={styles.reviewerName}>{review.userId?.name || 'Anonymous'}</Text>
                      <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                    </View>
                    {review.productId?.productName ? (
                      <View style={styles.reviewProductBadge}>
                        <Text style={styles.reviewProductBadgeText}>☕ {review.productId.productName}</Text>
                      </View>
                    ) : (
                      <View style={[styles.reviewProductBadge, styles.reviewProductBadgeUnknown]}>
                        <Text style={styles.reviewProductBadgeText}>Unknown Product</Text>
                      </View>
                    )}
                    {review.comment ? <Text style={styles.reviewComment} numberOfLines={2}>{review.comment}</Text> : null}
                    {review.reviewImageUrl ? (
                      <Image source={{ uri: review.reviewImageUrl }} style={styles.reviewListImage} />
                    ) : null}
                  </View>
                  <TouchableOpacity style={styles.deleteReviewBtn} onPress={() => handleDeleteProductReview(review._id)} activeOpacity={0.7}>
                    <Text style={styles.deleteReviewIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            );
          })()}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNavBar activeTab="Dashboard" onTabPress={handleAdminTabPress} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  notAuthText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },

  // ── TopAppBar ──
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(98,55,30,0.1)',
  },
  hamburger: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  hamburgerIcon: {
    fontSize: 22,
    color: colors.dark,
  },
  topBarLogo: {
    flex: 1,
    height: 32,
    alignSelf: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarInitial: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
  },
  customerToggleBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
  },
  customerToggleText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.s,
    color: colors.primary,
  },
  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // ── Dashboard Heading ──
  dashHeading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['3xl'],
    color: colors.dark,
    marginBottom: spacing.lg,
  },

  // ── Stats Grid ──
  statsGrid: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    shadowColor: colors.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 100,
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['4xl'],
    color: colors.primary,
    lineHeight: fontSizes['4xl'] + 4,
  },
  statTitle: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginTop: 4,
  },
  statDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#8B6A55',
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  trendArrow: {
    fontSize: fontSizes.sm,
    color: '#2e7d32',
    fontFamily: fonts.bold,
  },
  trendLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#2e7d32',
  },
  statLink: {
    marginTop: spacing.xs,
  },
  statLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // ── Search & Filter ──
  searchSection: {
    marginBottom: spacing.md,
  },
  searchInputWrap: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.15)',
    marginBottom: spacing.sm,
    shadowColor: colors.dark,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  clearSearch: {
    fontSize: 14,
    color: '#A0856E',
    paddingLeft: spacing.sm,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.2)',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  chipTextActive: {
    color: '#fff',
  },

  // ── Product List ──
  productListSection: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: '#A0856E',
  },

  // ── Product Card ──
  productCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.cardLg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.dark,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  productImageWrap: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  productImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImagePlaceholderText: {
    fontSize: 48,
  },
  availBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  availBadgeOn: {
    backgroundColor: 'rgba(46,125,50,0.9)',
  },
  availBadgeOff: {
    backgroundColor: 'rgba(198,40,40,0.9)',
  },
  availBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#fff',
  },
  productInfo: {
    padding: spacing.md,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    flex: 1,
    marginRight: spacing.sm,
  },
  productPrice: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.base,
    color: colors.primary,
  },
  productDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#8B6A55',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  productActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.input,
    alignItems: 'center',
  },
  editBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#fde8e8',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.input,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#c62828',
  },

  // Section cards
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionCardTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  sectionCardLink: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  sectionCardCount: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(46,21,0,0.5)',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#A0856E',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  // Promo rows
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: spacing.sm,
  },
  promoCodePill: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  promoCodeText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
    color: colors.primary,
    letterSpacing: 1,
  },
  promoDiscount: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  promoExpiry: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#A0856E',
  },
  // ── Review Filter Tabs ──
  reviewFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewFilterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EDE6',
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.12)',
  },
  reviewFilterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reviewFilterTabText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  reviewFilterTabTextActive: {
    color: '#FFFFFF',
  },

  // ── Product Name Dropdown ──
  productDropdownWrap: {
    marginBottom: spacing.md,
    zIndex: 10,
  },
  productDropdownTrigger: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5EDE6',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.15)',
    paddingHorizontal: spacing.md,
  },
  productDropdownTriggerText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  productDropdownChevron: {
    fontSize: 11,
    color: colors.primary,
  },
  productDropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: 'rgba(98,55,30,0.12)',
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: colors.dark,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productDropdownOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(98,55,30,0.06)',
  },
  productDropdownOptionActive: {
    backgroundColor: colors.accent,
  },
  productDropdownOptionText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  productDropdownOptionTextActive: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },

  // ── Review rows ──
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: spacing.sm,
  },
  reviewInfo: { flex: 1 },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  reviewerName: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  reviewProductBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 3,
    marginBottom: 2,
  },
  reviewProductBadgeUnknown: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  reviewProductBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  reviewRating: {
    fontSize: 12,
    color: '#F57C00',
    marginTop: 2,
  },
  reviewComment: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: '#6B5E57',
    marginTop: 2,
    lineHeight: 16,
  },
  reviewListImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginTop: 8,
  },
  deleteReviewBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.input,
    backgroundColor: 'rgba(211,47,47,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteReviewIcon: { fontSize: 14 },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 76,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.dark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
    fontFamily: fonts.light,
  },
});
