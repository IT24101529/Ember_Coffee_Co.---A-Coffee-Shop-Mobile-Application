import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  TextInput,
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
import Badge from '../components/ui/Badge';
import { BRAND_LOGO_URI } from '../components/ui/TopAppBar';

import colors from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import spacing, { borderRadius } from '../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_MARGIN = spacing.lg; // 24

const CATEGORIES = ['All', 'Signature Brews', 'Espresso', 'Tea', 'Iced Drinks', 'Pastries'];

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function MenuScreen({ navigation }) {
  const { items: cartItems, addItem } = useCart();

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/products`);
      const data = Array.isArray(res.data) ? res.data : [];
      setAllProducts(data);
    } catch (_) {
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, [fetchProducts]);

  // Apply search + category filters
  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch = searchQuery
      ? (p.productName || p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : (p.category || '').toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Group filtered products by category
  const grouped = filteredProducts.reduce((acc, product) => {
    const cat = product.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const handleTabPress = (tab) => {
    const map = { Home: 'Home', Menu: 'Menu', Rewards: 'Rewards', Orders: 'Orders', Profile: 'Profile' };
    if (map[tab] && tab !== 'Menu') navigation?.navigate(map[tab]);
  };

  const handleProductPress = (product) => {
    navigation?.navigate('ProductDetail', { product });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* Top App Bar — custom header with hamburger + logo + cart */}
      <View style={styles.header}>
        <View style={styles.iconBtn} />
        <Image source={{ uri: BRAND_LOGO_URI }} style={styles.headerLogo} resizeMode="contain" />
        <TouchableOpacity
          onPress={() => navigation?.navigate('Cart')}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image
            source={{ uri: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775211239/cart_icon_az8hkp.png' }}
            style={styles.cartIconImg}
            resizeMode="contain"
          />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Find your perfect brew..."
            placeholderTextColor="rgba(0,0,0,0.35)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        style={styles.chipsScroll}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => setSelectedCategory(cat)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
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
          {Object.keys(grouped).length === 0 ? (
            <EmptyState searchQuery={searchQuery} selectedCategory={selectedCategory} />
          ) : (
            Object.entries(grouped).map(([category, products]) => (
              <CategorySection
                key={category}
                category={category}
                products={products}
                onProductPress={handleProductPress}
                onAddToCart={addItem}
              />
            ))
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <BottomNavBar activeTab="Menu" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

// ─── Category Section Router ─────────────────────────────────────────────────
function CategorySection({ category, products, onProductPress, onAddToCart }) {
  const catLower = category.toLowerCase();

  if (catLower === 'signature brews') {
    return (
      <SignatureBrewsSection
        products={products}
        onProductPress={onProductPress}
        onAddToCart={onAddToCart}
      />
    );
  }
  if (catLower === 'pastries') {
    return (
      <PastriesSection
        products={products}
        onProductPress={onProductPress}
        onAddToCart={onAddToCart}
      />
    );
  }
  // Espresso, Tea, Iced Drinks, and unknown categories → 2-column grid
  return (
    <GridSection
      category={category}
      products={products}
      onProductPress={onProductPress}
      onAddToCart={onAddToCart}
    />
  );
}

// ─── Signature Brews Section ─────────────────────────────────────────────────
function SignatureBrewsSection({ products, onProductPress, onAddToCart }) {
  const [first, second, ...rest] = products;

  return (
    <View style={sectionStyles.section}>
      <SectionHeader title="Signature Brews" />

      {/* Large feature card for first product */}
      {first && (
        <LargeFeatureCard
          product={first}
          isEditorsPick
          onPress={() => onProductPress(first)}
          onAddToCart={onAddToCart}
        />
      )}

      {/* Small feature card for second product */}
      {second && (
        <SmallFeatureCard
          product={second}
          onPress={() => onProductPress(second)}
          onAddToCart={onAddToCart}
        />
      )}

      {/* Remaining as grid */}
      {rest.length > 0 && (
        <TwoColumnGrid
          products={rest}
          onProductPress={onProductPress}
          onAddToCart={onAddToCart}
        />
      )}
    </View>
  );
}

// ─── Large Feature Card ───────────────────────────────────────────────────────
function LargeFeatureCard({ product, isEditorsPick, onPress, onAddToCart }) {
  const [added, setAdded] = useState(false);
  const name = product?.productName || product?.name || 'Signature Brew';
  const description = product?.description || 'A carefully crafted signature blend.';
  const price = product?.price != null ? `Rs. ${Number(product.price).toFixed(2)}` : '';
  const unavailable = product?.isAvailable === false;

  const handleAdd = () => {
    if (unavailable) return;
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <TouchableOpacity
      style={largeFeatureStyles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image placeholder */}
      {product?.productImageUrl
        ? <Image source={{ uri: product.productImageUrl }} style={largeFeatureStyles.image} resizeMode="cover" />
        : <View style={largeFeatureStyles.image} />
      }
      <View style={largeFeatureStyles.overlay} />
      {unavailable && <View style={largeFeatureStyles.unavailableOverlay}><Text style={largeFeatureStyles.unavailableText}>Unavailable</Text></View>}

      {/* Content */}
      <View style={largeFeatureStyles.content}>
        {isEditorsPick && (
          <Badge label="Editor's Pick" variant="accent" style={largeFeatureStyles.badge} />
        )}
        <Text style={largeFeatureStyles.name}>{name}</Text>
        <Text style={largeFeatureStyles.description} numberOfLines={2}>
          {description}
        </Text>
        <View style={largeFeatureStyles.footer}>
          <Text style={largeFeatureStyles.price}>{price}</Text>
          <TouchableOpacity
            style={[largeFeatureStyles.addBtn, (added || unavailable) && largeFeatureStyles.addBtnAdded, unavailable && largeFeatureStyles.addBtnDisabled]}
            onPress={handleAdd}
            activeOpacity={0.8}
            disabled={unavailable}
          >
            <Text style={largeFeatureStyles.addBtnText}>{added ? '✓ Added' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const LARGE_CARD_HEIGHT = 240;

const largeFeatureStyles = StyleSheet.create({
  card: {
    marginHorizontal: HORIZONTAL_MARGIN,
    marginBottom: spacing.md,
    height: LARGE_CARD_HEIGHT,
    borderRadius: borderRadius.cardLg,
    overflow: 'hidden',
    backgroundColor: colors.dark,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(46,21,0,0.55)',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  badge: {
    marginBottom: spacing.sm,
  },
  name: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['2xl'],
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.accent,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  addBtnAdded: {
    backgroundColor: '#38A169',
  },
  addBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  addBtnDisabled: {
    backgroundColor: '#ccc',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(198,40,40,0.85)',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  unavailableText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#fff',
  },
});

// ─── Small Feature Card (Winter Roast style) ──────────────────────────────────
function SmallFeatureCard({ product, onPress, onAddToCart }) {
  const [added, setAdded] = useState(false);
  const name = product?.productName || product?.name || 'Winter Roast';
  const price = product?.price != null ? `Rs. ${Number(product.price).toFixed(2)}` : '';
  const unavailable = product?.isAvailable === false;

  const handleAdd = () => {
    if (unavailable) return;
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <TouchableOpacity
      style={smallFeatureStyles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Decorative circle element */}
      <View style={smallFeatureStyles.decorCircle} />
      <View style={smallFeatureStyles.decorCircleInner} />

      {/* Image placeholder */}
      {product?.productImageUrl
        ? <Image source={{ uri: product.productImageUrl }} style={smallFeatureStyles.image} resizeMode="cover" />
        : <View style={smallFeatureStyles.image} />
      }
      {unavailable && <View style={smallFeatureStyles.unavailableOverlay}><Text style={smallFeatureStyles.unavailableText}>Unavailable</Text></View>}

      {/* Info */}
      <View style={smallFeatureStyles.info}>
        <Text style={smallFeatureStyles.name} numberOfLines={1}>{name}</Text>
        <View style={smallFeatureStyles.row}>
          <Text style={smallFeatureStyles.price}>{price}</Text>
          <TouchableOpacity
            style={[smallFeatureStyles.addBtn, (added || unavailable) && smallFeatureStyles.addBtnAdded, unavailable && smallFeatureStyles.addBtnDisabled]}
            onPress={handleAdd}
            activeOpacity={0.8}
            disabled={unavailable}
          >
            <Text style={smallFeatureStyles.addBtnText}>{added ? '✓' : '+'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const SMALL_FEATURE_HEIGHT = 120;

const smallFeatureStyles = StyleSheet.create({
  card: {
    marginHorizontal: HORIZONTAL_MARGIN,
    marginBottom: spacing.md,
    height: SMALL_FEATURE_HEIGHT,
    borderRadius: borderRadius.card,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  decorCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent,
    opacity: 0.4,
  },
  decorCircleInner: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    opacity: 0.6,
  },
  image: {
    width: 110,
    height: '100%',
    backgroundColor: colors.primary,
    opacity: 0.75,
  },
  info: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.lg,
    color: colors.primary,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnAdded: {
    backgroundColor: '#38A169',
  },
  addBtnDisabled: {
    backgroundColor: '#ccc',
  },
  addBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#FFFFFF',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(198,40,40,0.85)',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unavailableText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#fff',
  },
});

// ─── Grid Section (Espresso / Tea / fallback) ─────────────────────────────────
function GridSection({ category, products, onProductPress, onAddToCart }) {
  return (
    <View style={sectionStyles.section}>
      <SectionHeader title={category} />
      <TwoColumnGrid
        products={products}
        onProductPress={onProductPress}
        onAddToCart={onAddToCart}
      />
    </View>
  );
}

// ─── Two-Column Grid ──────────────────────────────────────────────────────────
function TwoColumnGrid({ products, onProductPress, onAddToCart }) {
  const rows = [];
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2));
  }

  return (
    <View style={gridStyles.container}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={gridStyles.row}>
          {row.map((product) => (
            <GridCard
              key={product._id || product.id || product.productName}
              product={product}
              onPress={() => onProductPress(product)}
              onAddToCart={onAddToCart}
            />
          ))}
          {/* Fill empty slot if odd number */}
          {row.length === 1 && <View style={gridStyles.emptySlot} />}
        </View>
      ))}
    </View>
  );
}

function GridCard({ product, onPress, onAddToCart }) {
  const [added, setAdded] = useState(false);
  const name = product?.productName || product?.name || 'Coffee';
  const price = product?.price != null ? `Rs. ${Number(product.price).toFixed(2)}` : '';
  const unavailable = product?.isAvailable === false;

  const handleAdd = () => {
    if (unavailable) return;
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <TouchableOpacity style={[gridCardStyles.card, unavailable && gridCardStyles.cardUnavailable]} onPress={onPress} activeOpacity={unavailable ? 1 : 0.85}>
      {product?.productImageUrl
        ? <Image source={{ uri: product.productImageUrl }} style={gridCardStyles.image} resizeMode="cover" />
        : <View style={gridCardStyles.image} />
      }
      {unavailable && <View style={gridCardStyles.unavailableOverlay}><Text style={gridCardStyles.unavailableText}>Unavailable</Text></View>}
      <View style={gridCardStyles.info}>
        <Text style={gridCardStyles.name} numberOfLines={2}>{name}</Text>
        <View style={gridCardStyles.footer}>
          <Text style={gridCardStyles.price}>{price}</Text>
          <TouchableOpacity
            style={[gridCardStyles.addBtn, (added || unavailable) && gridCardStyles.addBtnAdded, unavailable && gridCardStyles.addBtnDisabled]}
            onPress={handleAdd}
            activeOpacity={0.8}
            disabled={unavailable}
          >
            <Text style={gridCardStyles.addBtnText}>{added ? '✓' : '+'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const GRID_GAP = spacing.sm;
const GRID_CONTENT_WIDTH = SCREEN_WIDTH - HORIZONTAL_MARGIN * 2;
const CARD_WIDTH = (GRID_CONTENT_WIDTH - GRID_GAP) / 2;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 0.75;

const gridStyles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    gap: GRID_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  emptySlot: {
    width: CARD_WIDTH,
  },
});

const gridCardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.card,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colors.accent,
  },
  info: {
    padding: spacing.sm,
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginBottom: spacing.xs,
    minHeight: 32,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnAdded: {
    backgroundColor: '#38A169',
  },
  addBtnDisabled: {
    backgroundColor: '#ccc',
  },
  addBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  cardUnavailable: { opacity: 0.6 },
  unavailableOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(198,40,40,0.85)',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unavailableText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#fff',
  },
});

// ─── Pastries Section ─────────────────────────────────────────────────────────
function PastriesSection({ products, onProductPress, onAddToCart }) {
  return (
    <View style={pastriesStyles.section}>
      <SectionHeader title="Daily Pastries" />
      <View style={pastriesStyles.list}>
        {products.map((product) => (
          <PastryListItem
            key={product._id || product.id || product.productName}
            product={product}
            onPress={() => onProductPress(product)}
            onAddToCart={onAddToCart}
          />
        ))}
      </View>
    </View>
  );
}

function PastryListItem({ product, onPress, onAddToCart }) {
  const [qty, setQty] = useState(0);
  const name = product?.productName || product?.name || 'Pastry';
  const description = product?.description || 'Freshly baked daily.';
  const price = product?.price != null ? `Rs. ${Number(product.price).toFixed(2)}` : '';
  const unavailable = product?.isAvailable === false;

  const handleAdd = () => {
    if (unavailable) return;
    onAddToCart(product);
    setQty((q) => q + 1);
  };

  return (
    <TouchableOpacity style={pastryItemStyles.item} onPress={onPress} activeOpacity={0.85}>
      {/* Thumbnail */}
      <View>
        {product?.productImageUrl
          ? <Image source={{ uri: product.productImageUrl }} style={pastryItemStyles.thumbnail} resizeMode="cover" />
          : <View style={pastryItemStyles.thumbnail} />
        }
        {unavailable && <View style={pastryItemStyles.unavailableOverlay}><Text style={pastryItemStyles.unavailableText}>Out</Text></View>}
      </View>

      {/* Info */}
      <View style={pastryItemStyles.info}>
        <Text style={pastryItemStyles.name} numberOfLines={1}>{name}</Text>
        <Text style={pastryItemStyles.description} numberOfLines={2}>{description}</Text>
        <Text style={pastryItemStyles.price}>{price}</Text>
      </View>

      {/* Quantity badge + add button */}
      <View style={pastryItemStyles.actions}>
        {qty > 0 && (
          <View style={pastryItemStyles.qtyBadge}>
            <Text style={pastryItemStyles.qtyText}>{qty}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[pastryItemStyles.addBtn, unavailable && pastryItemStyles.addBtnDisabled]}
          onPress={handleAdd}
          activeOpacity={0.8}
          disabled={unavailable}
        >
          <Text style={pastryItemStyles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const pastriesStyles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.accent,
    paddingBottom: spacing.md,
    borderRadius: borderRadius.cardLg,
    marginHorizontal: HORIZONTAL_MARGIN,
    overflow: 'hidden',
  },
  list: {
    paddingHorizontal: spacing.md,
  },
});

const pastryItemStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.card,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  thumbnail: {
    width: 80,
    height: 80,
    backgroundColor: colors.primary,
    opacity: 0.75,
  },
  info: {
    flex: 1,
    padding: spacing.sm,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginBottom: 2,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(0,0,0,0.55)',
    marginBottom: 4,
  },
  price: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  actions: {
    paddingRight: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  qtyBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
    color: '#FFFFFF',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  addBtnDisabled: {
    backgroundColor: '#ccc',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(198,40,40,0.85)',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unavailableText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: '#fff',
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <View style={sectionStyles.header}>
      <Text style={sectionStyles.title}>{title}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
  },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ searchQuery, selectedCategory }) {
  const message =
    searchQuery
      ? `No results for "${searchQuery}"`
      : `No products in ${selectedCategory}`;

  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>☕</Text>
      <Text style={emptyStyles.message}>{message}</Text>
      <Text style={emptyStyles.sub}>Try a different search or category</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: HORIZONTAL_MARGIN,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(0,0,0,0.45)',
    textAlign: 'center',
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // TopAppBar icon buttons
  iconBtn: {
    position: 'relative',
    padding: 4,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    color: colors.dark,
  },
  // Custom header
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  headerLogo: {
    flex: 1,
    height: 32,
    alignSelf: 'center',
  },
  cartIconImg: {
    width: 24,
    height: 24,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,    backgroundColor: colors.primary,
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
  // Search bar
  searchContainer: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingVertical: spacing.sm,
  },
  searchBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.cardLg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
    height: '100%',
  },
  clearIcon: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.4)',
    padding: 4,
  },
  // Category chips
  chipsScroll: {
    flexGrow: 0,
  },
  chipsContainer: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
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
    color: '#FFFFFF',
  },
});
