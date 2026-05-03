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




export default function AdminDashboardScreen({ navigation }) {
  const { user, token } = useAuth();

  const [storeReviews, setStoreReviews]   = useState([]);
  const [productReviews, setProductReviews] = useState([]);

  // Review filter state: 'store' (default) or 'product'
  const [reviewFilter, setReviewFilter]   = useState('store');
  // Product name filter for product reviews
  const [productFilter, setProductFilter] = useState('All');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

 
 

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ storeRevRes, prodRevRes] = await Promise.allSettled([
        
        axios.get(`${BASE_URL}/api/store-reviews`),
        axios.get(`${BASE_URL}/api/reviews`, authHeader),
        
      ]);
      if (storeRevRes.status === 'fulfilled') setStoreReviews(storeRevRes.value.data || []);
      if (prodRevRes.status === 'fulfilled')  setProductReviews(prodRevRes.value.data || []);
   
    } catch (err) {
      Alert.alert('Error', 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));


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
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>

     
      

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


// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
 
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
 
});
