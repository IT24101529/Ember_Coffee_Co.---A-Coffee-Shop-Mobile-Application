import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Image,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

import TopAppBar from '../components/ui/TopAppBar';
import BottomNavBar from '../components/ui/BottomNavBar';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

import colors from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import spacing, { borderRadius } from '../theme/spacing';
import {
  LOYALTY_MILESTONES,
  getTierShortName,
  getHomeJourneyProgress,
  effectiveLoyaltyPoints,
} from '../utils/loyaltyTier';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 260;
const HORIZONTAL_MARGIN = spacing.lg; // 24

export default function HomeScreen({ navigation }) {
  const { token } = useAuth();
  const { items: cartItems } = useCart();

  const [promo, setPromo] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [signatureProducts, setSignatureProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [promoRes, productsRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/api/promotions`),
        axios.get(`${BASE_URL}/api/products`),
      ]);

      if (promoRes.status === 'fulfilled') {
        const promos = promoRes.value.data;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        setPromo(Array.isArray(promos) ? promos.filter(p => 
          p.isActive !== false && 
          p.showOnHome !== false && 
          new Date(p.validUntil) >= todayStart
        ) : []);
      }

      if (productsRes.status === 'fulfilled') {
        const all = productsRes.value.data;
        const available = Array.isArray(all)
          ? all.filter((p) => p.isAvailable !== false)
          : [];
        setProducts(available.slice(0, 3));
        setSignatureProducts(
          available.filter((p) =>
            (p.category || '').toLowerCase() === 'signature brews'
          )
        );
      }

      if (token) {
        try {
          const profileRes = await axios.get(`${BASE_URL}/api/auth/profile`, { headers });
          setProfile(profileRes.data);
        } catch (_) {
          // profile fetch optional
        }
      }
    } catch (_) {
      // graceful degradation
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  const navigateTo = (screen, params) => {
    navigation?.navigate(screen, params);
  };

  const handleTabPress = (tab) => {
    const map = {
      Home: 'Home',
      Menu: 'Menu',
      Rewards: 'Rewards',
      Orders: 'Orders',
      Profile: 'Profile',
    };
    if (map[tab] && tab !== 'Home') {
      navigation?.navigate(map[tab]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* Top App Bar */}
      <TopAppBar
        title="EMBER COFFEE CO."
        rightElement={
          <TouchableOpacity
            onPress={() => navigateTo('Cart')}
            style={styles.cartBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={{ uri: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775211239/cart_icon_az8hkp.png' }}
              style={styles.cartIcon}
              resizeMode="contain"
            />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Hero Promotional Banner */}
            <HeroBanner
              promo={Array.isArray(promo) ? promo[0] : promo}
              signatureProducts={signatureProducts}
              onOrderNow={() => navigateTo('Menu')}
              onProductPress={(product) => navigateTo('ProductDetail', { product })}
            />

            {/* Rewards Tracker */}
            <RewardsTracker profile={profile} />

            {/* Quick Order Section */}
            <QuickOrderSection
              products={products}
              onViewAll={() => navigateTo('Menu')}
              onProductPress={(product) =>
                navigateTo('ProductDetail', { product })
              }
            />

            {/* Promotions Section */}
            <PromotionsSection promos={Array.isArray(promo) ? promo : []} />

            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>

      {/* Bottom Nav Bar */}
      <BottomNavBar activeTab="Home" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

// ─── Hero Banner (auto-scrolling Signature Brews carousel) ──────────────────
function HeroBanner({ promo, signatureProducts, onOrderNow, onProductPress }) {
  const scrollRef = useRef(null);
  const currentIndex = useRef(0);
  const items = signatureProducts && signatureProducts.length > 0
    ? signatureProducts
    : [{ _id: 'placeholder', productName: promo?.title || 'Start Your Morning Right', description: promo?.description || 'Handcrafted espresso drinks made with love.', productImageUrl: null }];

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % items.length;
      scrollRef.current?.scrollTo({ x: currentIndex.current * (SCREEN_WIDTH - HORIZONTAL_MARGIN * 2), animated: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <View style={heroBannerStyles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={heroBannerStyles.scroll}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item._id}
            style={heroBannerStyles.container}
            activeOpacity={item._productId ? 0.85 : 1}
            onPress={() => item.price != null && onProductPress && onProductPress(item)}
          >
            {item.productImageUrl
              ? <Image source={{ uri: item.productImageUrl }} style={heroBannerStyles.image} resizeMode="cover" />
              : <View style={heroBannerStyles.imagePlaceholder} />
            }
            <View style={heroBannerStyles.gradientBottom} />
            <View style={heroBannerStyles.content}>
              <Badge label="Signature Brew" variant="accent" style={heroBannerStyles.badge} />
              <Text style={heroBannerStyles.heading} numberOfLines={2}>{item.productName}</Text>
              <Text style={heroBannerStyles.description} numberOfLines={2}>{item.description}</Text>
              {item.price != null && (
                <Text style={heroBannerStyles.price}>Rs. {Number(item.price).toFixed(2)}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const heroBannerStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: HORIZONTAL_MARGIN,
    marginTop: spacing.md,
    borderRadius: borderRadius.cardLg,
    overflow: 'hidden',
    height: HERO_HEIGHT,
  },
  scroll: {
    height: HERO_HEIGHT,
  },
  container: {
    width: SCREEN_WIDTH - HORIZONTAL_MARGIN * 2,
    height: HERO_HEIGHT,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.dark,
  },
  gradientBottom: {
    ...StyleSheet.absoluteFillObject,
    top: '35%',
    backgroundColor: 'rgba(46,21,0,0.72)',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  badge: {
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  heading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['2xl'],
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.accent,
  },
});

// ─── Rewards Tracker ─────────────────────────────────────────────────────────
function RewardsTracker({ profile }) {
  const raw = profile?.totalPoints ?? profile?.points ?? 0;
  const totalPoints = effectiveLoyaltyPoints(raw);
  const tierName = getTierShortName(totalPoints);
  const progressPct = getHomeJourneyProgress(totalPoints);

  return (
    <Card style={rewardsStyles.card} shadow>
      <Text style={rewardsStyles.heading}>Your Brew Journey</Text>
      <View style={rewardsStyles.tierRow}>
        <Text style={rewardsStyles.tierName}>{tierName}</Text>
        <View style={rewardsStyles.starRow}>
          <Text style={rewardsStyles.starIcon}>⭐</Text>
          <Text style={rewardsStyles.starCount}>{totalPoints} pts</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={rewardsStyles.progressTrack}>
        <View style={[rewardsStyles.progressFill, { width: `${progressPct * 100}%` }]} />
      </View>

      {/* Milestone icons */}
      <View style={rewardsStyles.milestonesRow}>
        {LOYALTY_MILESTONES.map((m) => {
          const reached = totalPoints >= m.points;
          return (
            <View key={m.label} style={rewardsStyles.milestone}>
              <View style={[rewardsStyles.milestoneIcon, reached && rewardsStyles.milestoneIconActive]}>
                <Text style={rewardsStyles.milestoneEmoji}>{m.icon}</Text>
              </View>
              <Text style={rewardsStyles.milestoneLabel}>{m.label}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const rewardsStyles = StyleSheet.create({
  card: {
    marginHorizontal: HORIZONTAL_MARGIN,
    marginTop: spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tierName: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starIcon: {
    fontSize: 14,
  },
  starCount: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
  },
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  milestone: {
    alignItems: 'center',
    gap: 4,
  },
  milestoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneIconActive: {
    backgroundColor: colors.primary,
  },
  milestoneEmoji: {
    fontSize: 20,
  },
  milestoneLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.dark,
  },
});

// ─── Quick Order Section ─────────────────────────────────────────────────────
function QuickOrderSection({ products, onViewAll, onProductPress }) {
  const [p0, p1, p2] = products;

  return (
    <View style={quickOrderStyles.section}>
      {/* Section header */}
      <View style={quickOrderStyles.header}>
        <Text style={quickOrderStyles.sectionTitle}>Quick Order</Text>
        <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={quickOrderStyles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Bento grid: 2 small left + 1 large right */}
      <View style={quickOrderStyles.grid}>
        {/* Left column: 2 small cards */}
        <View style={quickOrderStyles.leftCol}>
          <SmallProductCard product={p0} onPress={() => p0 && onProductPress(p0)} />
          <SmallProductCard product={p1} onPress={() => p1 && onProductPress(p1)} />
        </View>

        {/* Right column: 1 large card */}
        <LargeProductCard product={p2} onPress={() => p2 && onProductPress(p2)} />
      </View>
    </View>
  );
}

function SmallProductCard({ product, onPress }) {
  const name = product?.productName || product?.name || 'Coffee';
  const price = product?.price != null ? `Rs. ${product.price.toFixed(2)}` : '';

  return (
    <TouchableOpacity style={smallCardStyles.card} onPress={onPress} activeOpacity={0.8}>
      {product?.productImageUrl
        ? <Image source={{ uri: product.productImageUrl }} style={smallCardStyles.imagePlaceholder} resizeMode="cover" />
        : <View style={smallCardStyles.imagePlaceholder} />
      }
      <View style={smallCardStyles.info}>
        <Text style={smallCardStyles.name} numberOfLines={1}>{name}</Text>
        {!!price && <Text style={smallCardStyles.price}>{price}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function LargeProductCard({ product, onPress }) {
  const name = product?.productName || product?.name || 'Morning Set';
  const price = product?.price != null ? `Rs. ${product.price.toFixed(2)}` : '';
  const description = product?.description || 'The perfect start to your day.';

  return (
    <TouchableOpacity style={largeCardStyles.card} onPress={onPress} activeOpacity={0.8}>
      {product?.productImageUrl
        ? <Image source={{ uri: product.productImageUrl }} style={largeCardStyles.imagePlaceholder} resizeMode="cover" />
        : <View style={largeCardStyles.imagePlaceholder} />
      }
      <View style={largeCardStyles.overlay} />
      <View style={largeCardStyles.content}>
        <Text style={largeCardStyles.name} numberOfLines={2}>{name}</Text>
        <Text style={largeCardStyles.description} numberOfLines={2}>{description}</Text>
        {!!price && <Text style={largeCardStyles.price}>{price}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const GRID_GAP = spacing.sm;
const GRID_WIDTH = SCREEN_WIDTH - HORIZONTAL_MARGIN * 2;
const LEFT_COL_WIDTH = GRID_WIDTH * 0.45;
const RIGHT_COL_WIDTH = GRID_WIDTH - LEFT_COL_WIDTH - GRID_GAP;
const SMALL_CARD_HEIGHT = (GRID_WIDTH * 0.55 - GRID_GAP) / 2;
const LARGE_CARD_HEIGHT = SMALL_CARD_HEIGHT * 2 + GRID_GAP;

const quickOrderStyles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: HORIZONTAL_MARGIN,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
  },
  viewAll: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  leftCol: {
    width: LEFT_COL_WIDTH,
    gap: GRID_GAP,
  },
});

const smallCardStyles = StyleSheet.create({
  card: {
    width: LEFT_COL_WIDTH,
    height: SMALL_CARD_HEIGHT,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.accent,
  },
  info: {
    padding: spacing.sm,
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.dark,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
    color: colors.primary,
    marginTop: 2,
  },
});

const largeCardStyles = StyleSheet.create({
  card: {
    width: RIGHT_COL_WIDTH,
    height: LARGE_CARD_HEIGHT,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    backgroundColor: colors.dark,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(46,21,0,0.55)',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  price: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.base,
    color: colors.accent,
  },
});

// ─── Promotions Section ───────────────────────────────────────────────────────
const PROMO_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const PROMO_CARD_HEIGHT = 180;

function PromotionsSection({ promos }) {
  if (!promos || promos.length === 0) return null;
  return (
    <View style={promoSectionStyles.section}>
      <Text style={promoSectionStyles.sectionTitle}>Active Promotions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={promoSectionStyles.scrollContent}
      >
        {promos.map((promo) => (
          <View key={promo._id} style={promoSectionStyles.card}>
            {promo.promoBannerUrl
              ? <Image source={{ uri: promo.promoBannerUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.primary, opacity: 0.8 }]} />
            }
            <View style={promoSectionStyles.overlay} />
            <View style={promoSectionStyles.content}>
              <View style={promoSectionStyles.codePill}>
                <Text style={promoSectionStyles.codeText}>{promo.promoCode}</Text>
              </View>
              <Text style={promoSectionStyles.discount}>{promo.discountPercent}% OFF</Text>
              <Text style={promoSectionStyles.expiry}>
                Expires {new Date(promo.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const promoSectionStyles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    marginBottom: spacing.md,
    paddingHorizontal: HORIZONTAL_MARGIN,
  },
  scrollContent: { paddingHorizontal: HORIZONTAL_MARGIN, gap: spacing.md },
  card: {
    width: PROMO_CARD_WIDTH,
    height: PROMO_CARD_HEIGHT,
    borderRadius: borderRadius.cardLg,
    overflow: 'hidden',
    backgroundColor: colors.dark,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(46,21,0,0.55)',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 3,
    marginBottom: spacing.xs,
  },
  codeText: { fontFamily: fonts.bold, fontSize: fontSizes.xs, color: colors.primary, letterSpacing: 1.5 },
  discount: { fontFamily: fonts.extraBold, fontSize: fontSizes['2xl'], color: '#fff', marginBottom: 2 },
  expiry: { fontFamily: fonts.regular, fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.75)' },
});

// ─── Main Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // TopAppBar right element
  cartBtn: {
    position: 'relative',
  },
  cartIcon: {
    width: 24,
    height: 24,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#FFFFFF',
  },
  fabBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.dark,
  },
});
