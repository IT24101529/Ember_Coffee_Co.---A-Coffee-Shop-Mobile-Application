import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import StarRating from '../components/ui/StarRating';
import ReviewFeed from '../components/ui/ReviewFeed';
import ReviewOverlay from '../components/ui/ReviewOverlay';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';

export default function ProductDetailScreen({ route, navigation }) {
  const { product: initialProduct } = route.params;
  const { addItem } = useCart();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState(initialProduct);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Review overlay
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const reviewFeedRef = useRef(null);


  // Fetch reviews
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const { data } = await axios.get(`${BASE_URL}/api/reviews/product/${initialProduct._id}`);
      setReviews(data);
      setReviewCount(data.length);
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    } catch {
      // silent
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [initialProduct._id]);

  const handleAddToCart = () => {
    const cartItem = { ...product, _id: product._id, _productId: product._id };
    addItem(cartItem, quantity);
    Alert.alert('Added to cart', `${quantity} × ${product.productName} added.`);
  };

  const handleReviewSuccess = () => {
    setOverlayVisible(false);
    fetchReviews();
  };

  const isUnavailable = product?.isAvailable === false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">

        {/* ── Review Feed Section ── */}
        <View style={styles.reviewSection}>
          <View style={styles.reviewSectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {token ? (
              <TouchableOpacity onPress={() => setOverlayVisible(true)}>
                <Text style={styles.writeReviewLink}>Write a Review</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {reviewsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <ReviewFeed 
              ref={reviewFeedRef} 
              productId={initialProduct._id} 
              onEditPreview={(review) => {
                setEditingReview(review);
                setOverlayVisible(true);
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Action Bar ── */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.actionPrice}>
          <Text style={styles.actionPriceLabel}>Total</Text>
          <Text style={styles.actionPriceValue}>Rs. {Number(product.price * quantity).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, isUnavailable && styles.addToCartBtnDisabled]}
          onPress={isUnavailable ? undefined : handleAddToCart}
          activeOpacity={isUnavailable ? 1 : 0.8}
        >
          <Text style={styles.addToCartText}>{isUnavailable ? 'Unavailable' : 'Add to Cart'}</Text>
        </TouchableOpacity>
      </View>

      <ReviewOverlay
        visible={overlayVisible}
        product={product}
        initialReview={editingReview}
        onClose={() => {
          setOverlayVisible(false);
          setEditingReview(null);
        }}
        onSuccess={() => {
          setEditingReview(null);
          handleReviewSuccess();
          if (reviewFeedRef.current) reviewFeedRef.current.refresh();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({

  // ── Review Section ──
  reviewSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes['2xl'],
    color: colors.dark,
  },
  writeReviewLink: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

});
