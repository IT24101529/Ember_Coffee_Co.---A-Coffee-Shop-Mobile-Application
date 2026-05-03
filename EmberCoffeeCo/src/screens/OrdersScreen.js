import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import StarRating from '../components/ui/StarRating';
import colors from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import spacing, { borderRadius } from '../theme/spacing';
import BottomNavBar from '../components/ui/BottomNavBar';

const STATUS_COLORS = {
  Pending: '#F57C00',
  Brewing: '#1565C0',
  Ready: '#2E7D32',
  Delivering: '#5E35B1',
  Delivered: '#1B5E20',
  Cancelled: '#C62828',
};

function ReviewCard({ review }) {
  const name = review.userId?.name || 'Anonymous';
  const avatar = review.userId?.profileImageUrl;
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {avatar
          ? <Image source={{ uri: avatar }} style={styles.reviewAvatar} />
          : <View style={[styles.reviewAvatar, styles.reviewAvatarFallback]}>
              <Text style={styles.reviewAvatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
        }
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewerName}>{name}</Text>
          <Text style={styles.reviewDate}>{date}</Text>
        </View>
      </View>
      <StarRating rating={review.rating} size={14} />
      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
      {review.reviewImageUrl ? (
        <Image source={{ uri: review.reviewImageUrl }} style={styles.reviewPhoto} resizeMode="cover" />
      ) : null}
    </View>
  );
}

export default function OrdersScreen() {
  const navigation = useNavigation();
 
  const [storeReviews, setStoreReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [reviewsRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/api/store-reviews`),
      ]);
      if (ordersRes.status === 'fulfilled') {
        const sorted = [...(ordersRes.value.data || [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(sorted);
      }
      if (historyRes.status === 'fulfilled') {
        const h = historyRes.value.data;
        setHistoryCount(Array.isArray(h) ? h.length : 0);
      }
      if (reviewsRes.status === 'fulfilled') {
        setStoreReviews(reviewsRes.value.data || []);
      }
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
       

          {/* ── Community Notes section ── */}
          <View style={styles.communitySection}>
            <View style={styles.communitySectionHeader}>
              <View>
                <Text style={styles.communityTitle}>Community Notes</Text>
                <Text style={styles.communitySubtitle}>What our customers are saying</Text>
              </View>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('ReviewsFeed')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => navigation.navigate('ReviewsFeed')}
              activeOpacity={0.85}
            >
              <Text style={styles.writeReviewBtnText}>✍️  Write a Review</Text>
            </TouchableOpacity>

            {storeReviews.slice(0, 3).map((review) => (
              <ReviewCard key={review._id} review={review} />
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <BottomNavBar activeTab="Orders" onTabPress={(tab) => navigation.navigate(tab)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
 
  // Community Notes section
  communitySection: { marginTop: spacing.xl },
  communitySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  communityTitle: { fontFamily: fonts.bold, fontSize: fontSizes.xl, color: colors.dark },
  communitySubtitle: { fontFamily: fonts.regular, fontSize: fontSizes.sm, color: 'rgba(46,21,0,0.5)', marginTop: 2 },
  seeAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  seeAllText: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.primary },

  // Review card
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.sm, backgroundColor: colors.accent },
  reviewAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  reviewAvatarText: { fontFamily: fonts.bold, fontSize: fontSizes.sm, color: '#fff' },
  reviewMeta: { flex: 1 },
  reviewerName: { fontFamily: fonts.semiBold, fontSize: fontSizes.md, color: colors.dark },
  reviewDate: { fontFamily: fonts.regular, fontSize: fontSizes.xs, color: 'rgba(46,21,0,0.45)', marginTop: 1 },
  reviewComment: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.8,
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  reviewPhoto: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.input,
  },

  // Write review button
  writeReviewBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  writeReviewBtnText: { fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: '#fff' },
});
