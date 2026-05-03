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

  // Fetch full product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/api/products/${initialProduct._id}`);
        setProduct(data);
      } catch {
        // fall back to passed product
      }
    };
    fetchProduct();
  }, [initialProduct._id]);

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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Image ── */}
        <View style={styles.heroContainer}>
          {product.productImageUrl ? (
            <Image
              source={{ uri: product.productImageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Text style={styles.heroPlaceholderIcon}>☕</Text>
            </View>
          )}
          {/* Gradient fade overlay */}
          <View style={styles.heroGradient} />
        </View>

        {/* ── Floating TopAppBar ── */}
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.topBarIcon}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle} numberOfLines={1}>
            {product.productName}
          </Text>

          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={() => navigation.navigate('Cart')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={{ uri: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775211239/cart_icon_az8hkp.png' }}
              style={styles.topBarCartIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* ── Product Info ── */}
        <View style={styles.infoSection}>
          {/* Category + Price row */}
          <View style={styles.categoryPriceRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>Rs. {Number(product.price).toFixed(2)}</Text>
            </View>
          </View>

          {/* Product name */}
          <Text style={styles.productName}>{product.productName}</Text>

          {/* Rating + review count + prep time */}
          <View style={styles.metaRow}>
            <StarRating rating={avgRating} size={14} />
            <Text style={styles.metaText}>
              {avgRating > 0 ? ` ${avgRating}` : ' —'}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>⏱ 5–10 min</Text>
          </View>

          {/* Description */}
          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}

          {/* ── Quantity Selector ── */}
          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.stepperControl}>
              <TouchableOpacity 
                onPress={() => setQuantity(Math.max(1, quantity - 1))} 
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperCount}>{quantity}</Text>
              <TouchableOpacity 
                onPress={() => setQuantity(quantity + 1)} 
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
  },

  // ── Hero ──
  heroContainer: {
    position: 'relative',
    height: 320,
  },
  heroImage: {
    width: '100%',
    height: 320,
  },
  heroPlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    fontSize: 64,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: colors.cream,
    opacity: 0.45,
  },

  // ── Floating TopAppBar ──
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    height: 48,
    zIndex: 10,
  },
  topBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCartIcon: {
    width: 22,
    height: 22,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginHorizontal: spacing.sm,
  },

  // ── Info Section ──
  infoSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  categoryPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priceBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  priceText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: '#fff',
  },
  productName: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['3xl'],
    color: colors.dark,
    marginBottom: spacing.sm,
    lineHeight: 36,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.65,
  },
  metaDot: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.4,
    marginHorizontal: 2,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
    opacity: 0.75,
    lineHeight: 24,
    marginBottom: spacing.md,
  },

  // ── Quantity Selector ──
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
  },
  quantityLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stepperBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    marginTop: -2,
  },
  stepperCount: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    width: 40,
    textAlign: 'center',
  },

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

  // ── Bottom Action Bar ──
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  actionPrice: {
    flex: 1,
  },
  actionPriceLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.55,
  },
  actionPriceValue: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.dark,
  },
  addToCartBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartBtnDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
