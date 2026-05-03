import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,

  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import TopAppBar from '../components/ui/TopAppBar';
import BottomNavBar from '../components/ui/BottomNavBar';
import StarRating from '../components/ui/StarRating';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';

const PAGE_SIZE = 10;
const FILTERS = ['All', '5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star', 'With Photos'];

// ─── Helper: initials avatar ────────────────────────────────────────────────
function InitialsAvatar({ name }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// ─── Review article ──────────────────────────────────────────────────────────
function ReviewArticle({ review }) {
  const name = review.userId?.name || 'Anonymous';
  const productName = review.productId?.productName || '';
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString()
    : '';

  return (
    <View style={styles.reviewArticle}>
      <View style={styles.reviewHeader}>
        {review.userId?.profileImageUrl ? (
          <Image source={{ uri: review.userId.profileImageUrl }} style={styles.avatar} />
        ) : (
          <InitialsAvatar name={name} />
        )}
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewerName}>{name}</Text>
          {productName ? (
            <Text style={styles.reviewProduct}>{productName}</Text>
          ) : null}
          <Text style={styles.reviewDate}>{date}</Text>
        </View>
        {review.onEdit && review.onDelete && (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => review.onEdit(review)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 13 }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => review.onDelete(review)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: '#e74c3c', fontFamily: fonts.bold, fontSize: 13 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <StarRating rating={review.rating} size="small" />
      {review.comment ? (
        <Text style={styles.reviewText}>{review.comment}</Text>
      ) : null}
      {review.reviewImageUrl ? (
        <View style={styles.photoGrid}>
          <Image
            source={{ uri: review.reviewImageUrl }}
            style={styles.reviewPhoto}
            resizeMode="cover"
          />
        </View>
      ) : null}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ReviewsFeedScreen({ navigation, route }) {
  const { user, token } = useAuth();
  // productId may be passed from ProductDetailScreen
  const productId = route?.params?.productId ?? null;

  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [page, setPage] = useState(1);

  // Submission form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // ── Fetch reviews ──────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const url = productId
        ? `${BASE_URL}/api/reviews/product/${productId}`
        : `${BASE_URL}/api/store-reviews`;
      const res = await axios.get(url);
      setAllReviews(res.data);
    } catch {
      Alert.alert('Error', 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReviews().finally(() => setRefreshing(false));
  }, [fetchReviews]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const filtered = allReviews.filter((r) => {
    if (activeFilter === '5 Stars') return r.rating === 5;
    if (activeFilter === '4 Stars') return r.rating === 4;
    if (activeFilter === '3 Stars') return r.rating === 3;
    if (activeFilter === '2 Stars') return r.rating === 2;
    if (activeFilter === '1 Star')  return r.rating === 1;
    if (activeFilter === 'With Photos') return !!r.reviewImageUrl;
    return true;
  });

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

  const avgRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

  // ── Photo picker ───────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    Alert.alert(
      'Add a Photo',
      'Choose the photo source',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Please allow camera access.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets?.length > 0) {
              setPhoto(result.assets[0]);
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Please allow photo access.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets?.length > 0) {
              setPhoto(result.assets[0]);
            }
          }
        }
      ]
    );
  };

  // ── Submit review ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }
    if (comment.trim().length === 0) {
      Alert.alert('Comment required', 'Please write a brief comment.');
      return;
    }
    try {
      setSubmitting(true);
      let reviewId;
      if (editingId) {
        const url = productId ? `${BASE_URL}/api/reviews/${editingId}` : `${BASE_URL}/api/store-reviews/${editingId}`;
        const payload = { rating, comment: comment.trim() };
        await axios.put(url, payload, { headers: { Authorization: `Bearer ${token}` } });
        reviewId = editingId;
      } else {
        const url = productId ? `${BASE_URL}/api/reviews` : `${BASE_URL}/api/store-reviews`;
        const payload = productId ? { productId, rating, comment: comment.trim() } : { rating, comment: comment.trim() };
        const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });
        reviewId = res.data._id;
      }
      
      if (photo) {
        const form = new FormData();
        form.append('image', {
          uri: photo.uri,
          name: 'review.jpg',
          type: 'image/jpeg',
        });
        const uploadUrl = productId 
          ? `${BASE_URL}/api/reviews/${reviewId}/upload` 
          : `${BASE_URL}/api/store-reviews/${reviewId}/upload`;
          
        await axios.post(uploadUrl, form, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
        });
      }
      setRating(0);
      setComment('');
      setPhoto(null);
      setEditingId(null);
      setPage(1);
      fetchReviews();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not save review.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review) => {
    setEditingId(review._id);
    setRating(review.rating);
    setComment(review.comment || '');
  };

  const handleDelete = (review) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const url = productId ? `${BASE_URL}/api/reviews/${review._id}` : `${BASE_URL}/api/store-reviews/${review._id}`;
          await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
          setPage(1);
          fetchReviews();
        } catch {
          Alert.alert('Error', 'Could not delete review.');
        }
      }}
    ]);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <TopAppBar
        title="EMBER COFFEE CO."
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Heading */}
        <Text style={styles.heading}>Community Notes</Text>
        <Text style={styles.subtitle}>Real reviews from real coffee lovers</Text>

        {/* Overall Rating Card */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingNumber}>{avgRating.toFixed(1)}</Text>
          <StarRating rating={avgRating} size="large" />
          <Text style={styles.reviewCount}>{allReviews.length} reviews</Text>
        </View>

        {/* Submission Card */}
        <View style={styles.submissionCard}>
          <Text style={styles.submissionHeading}>{editingId ? 'Edit Review' : 'Leave a Review'}</Text>
          {editingId && (
            <TouchableOpacity onPress={() => { setEditingId(null); setRating(0); setComment(''); }} style={{ position: 'absolute', top: spacing.lg, right: spacing.lg }}>
              <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontFamily: fonts.semiBold }}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.submissionLabel}>Your Rating</Text>
          <StarRating rating={rating} onRate={setRating} size="large" />
          <TextInput
            style={styles.textarea}
            placeholder="Your thoughts..."
            placeholderTextColor={colors.dark + '66'}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
          <View style={styles.submissionRow}>
            <TouchableOpacity onPress={pickPhoto} style={styles.photoBtn}>
              <Text style={styles.photoBtnText}>
                {photo ? '📷 Photo added' : '📷 Add Photo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, activeFilter === f && styles.chipActive]}
              onPress={() => { setActiveFilter(f); setPage(1); }}
            >
              <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reviews feed */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : displayed.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>☕</Text>
            <Text style={styles.emptyStateTitle}>Be the first to review</Text>
            <Text style={styles.emptyStateMessage}>
              Share your experience and help others discover great coffee.
            </Text>
          </View>
        ) : (
          displayed.map((review) => {
            const isMine = review.userId?._id === user?._id;
            return (
              <ReviewArticle
                key={review._id}
                review={{
                  ...review,
                  onEdit: isMine ? handleEdit : undefined,
                  onDelete: isMine ? handleDelete : undefined,
                }}
              />
            );
          })
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => setPage((p) => p + 1)}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <BottomNavBar
        activeTab="Menu"
        onTabPress={(tab) => navigation?.navigate(tab)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  navIcon: {
    fontSize: 20,
  },

  // Heading
  heading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['3xl'],
    color: colors.dark,
    marginTop: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.6,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  // Overall rating card
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ratingNumber: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['5xl'],
    color: colors.dark,
    lineHeight: fontSizes['5xl'] + 8,
  },
  reviewCount: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.5,
    marginTop: spacing.xs,
  },

  // Submission card
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  submissionHeading: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  submissionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.input,
    padding: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 88,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  submissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  photoBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  photoBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: '#fff',
  },

  // Filter chips
  filterRow: {
    marginBottom: spacing.md,
  },
  filterContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: '#fff',
    marginRight: spacing.sm,
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

  // Review article
  reviewArticle: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  reviewMeta: {
    flex: 1,
  },
  reviewerName: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  reviewProduct: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.primary,
    opacity: 0.8,
  },
  reviewDate: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.dark,
    opacity: 0.45,
  },
  reviewText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.8,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reviewPhoto: {
    width: '48%',
    height: 100,
    borderRadius: borderRadius.input,
  },

  // Load more
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loadMoreText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 22,
  },
});
