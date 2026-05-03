import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Alert, View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import StarRating from './StarRating';
import { useAuth } from '../../context/AuthContext';
import colors from '../../theme/colors';
import spacing, { borderRadius } from '../../theme/spacing';
import { fonts, fontSizes } from '../../theme/typography';

function reviewerFromReview(item) {
  const u = item.userId;
  if (u && typeof u === 'object' && (u.name || u.profileImageUrl)) {
    return {
      name: u.name || 'Member',
      avatar: u.profileImageUrl || null,
    };
  }
  return { name: 'Member', avatar: null };
}

/**
 * ReviewFeed component
 * - productId: string — fetches GET /api/reviews/product/:productId on mount
 * - Exposes a `refresh()` method via ref so parent can trigger a reload
 */
const ReviewFeed = forwardRef(function ReviewFeed({ productId, onEditPreview }, ref) {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${BASE_URL}/api/reviews/product/${productId}`);
      setReviews(res.data);
    } catch (err) {
      setError('Could not load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchReviews();
  }, [productId]);

  // Expose refresh() to parent via ref
  useImperativeHandle(ref, () => ({ refresh: fetchReviews }));

  const handleDelete = (review) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await axios.delete(`${BASE_URL}/api/reviews/${review._id}`, { headers: { Authorization: `Bearer ${token}` } });
          fetchReviews();
        } catch {
          Alert.alert('Error', 'Could not delete review.');
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No reviews yet. Be the first!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item._id}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const { name, avatar } = reviewerFromReview(item);
        return (
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.reviewerAvatar} />
            ) : (
              <View style={[styles.reviewerAvatar, styles.reviewerAvatarFallback]}>
                <Text style={styles.reviewerAvatarLetter}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.reviewerTextCol}>
              <Text style={styles.reviewerName} numberOfLines={1}>
                {name}
              </Text>
              <StarRating rating={item.rating} size={14} />
            </View>
          </View>
          {item.comment ? (
            <Text style={styles.reviewComment}>{item.comment}</Text>
          ) : null}
          {item.reviewImageUrl ? (
            <Image
              source={{ uri: item.reviewImageUrl }}
              style={styles.reviewImage}
              resizeMode="cover"
            />
          ) : null}

          {user && (user._id === (item.userId._id || item.userId)) && (
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => onEditPreview && onEditPreview(item)} style={styles.actionBtn}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: colors.error || '#D32F2F' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        );
      }}
    />
  );
});

export default ReviewFeed;

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSizes.md,
    color: '#C0392B',
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.45,
  },
  separator: {
    height: 1,
    backgroundColor: colors.accent,
    marginVertical: spacing.sm,
  },
  reviewCard: {
    paddingVertical: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
  },
  reviewerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  reviewerAvatarLetter: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: '#fff',
  },
  reviewerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  reviewerName: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.dark,
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  reviewImage: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.input,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#F5F5F5',
  },
  actionText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
});
