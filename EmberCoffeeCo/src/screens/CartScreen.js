import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import TopAppBar from '../components/ui/TopAppBar';
import BottomNavBar from '../components/ui/BottomNavBar';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';

const TAX_RATE = 0.06; // 6% SST
const STARS_PER_Rs = 0.01;

// ─── Cart Item Card ───────────────────────────────────────────────────────────

function CartItemCard({ item, onIncrement, onDecrement, onDelete }) {
  const customization = [item.milkType, item.size]
    .filter(Boolean)
    .join(' • ');

  return (
    <View style={styles.itemCard}>
      {/* Product image */}
      {item.productImageUrl ? (
        <Image
          source={{ uri: item.productImageUrl }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
          <Text style={styles.itemImagePlaceholderText}>☕</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.productName}
        </Text>
        {customization ? (
          <Text style={styles.itemCustomization} numberOfLines={1}>
            {customization}
          </Text>
        ) : null}
        <Text style={styles.itemPrice}>Rs. {Number(item.price).toFixed(2)}</Text>
      </View>

      {/* Quantity stepper */}
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={onDecrement}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperCount}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={onIncrement}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Delete icon */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.deleteBtnIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CartScreen({ navigation }) {
  const { items, addItem, removeItem } = useCart();
  const { token } = useAuth();

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);        // percent 0–100
  const [promoMessage, setPromoMessage] = useState('');
  const [promoValid, setPromoValid] = useState(null); // null | true | false
  const [promoLoading, setPromoLoading] = useState(false);

  // ── Derived totals ──────────────────────────────────────────────────────────
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = subtotal * (discount / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * TAX_RATE;
  const total = discountedSubtotal + tax;
  const starsEarned = Math.floor(total * STARS_PER_Rs);

  // ── Promo code validation ───────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code) {
      setPromoMessage('Please enter a promo code.');
      setPromoValid(false);
      return;
    }
    setPromoLoading(true);
    setPromoMessage('');
    setPromoValid(null);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/promotions/validate/${encodeURIComponent(code)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { discountPercent } = res.data;
      setDiscount(discountPercent);
      setPromoValid(true);
      setPromoMessage(`${discountPercent}% discount applied!`);
    } catch (err) {
      setDiscount(0);
      setPromoValid(false);
      setPromoMessage(err.response?.data?.message || 'Invalid or expired promo code.');
    } finally {
      setPromoLoading(false);
    }
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Empty cart', 'Add some items before checking out.');
      return;
    }
    navigation.navigate('Checkout', { discount, promoCode: promoCode.trim() });
  };

  // ── Cart icon for TopAppBar ─────────────────────────────────────────────────
  const cartIcon = (
    <TouchableOpacity onPress={() => {}} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={{ fontSize: 20 }}>🛒</Text>
    </TouchableOpacity>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TopAppBar
          title="Review Order"
          onBack={() => navigation.goBack()}
          rightElement={cartIcon}
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>☕</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse the menu and add something delicious.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Menu', { screen: 'MenuScreen' })}
            activeOpacity={0.8}
          >
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar activeTab="Cart" onTabPress={(tab) => {
          if (tab === 'Menu') navigation.navigate('Menu', { screen: 'MenuScreen' });
          else if (tab === 'Home') navigation.navigate('Home', { screen: 'HomeScreen' });
          else if (tab === 'Orders') navigation.navigate('Orders', { screen: 'OrdersScreen' });
          else navigation.navigate(tab);
        }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top App Bar ── */}
      <TopAppBar
        title="Review Order"
        onBack={() => navigation.goBack()}
        rightElement={cartIcon}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Heading ── */}
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Review Order</Text>
          <Text style={styles.itemCount}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* ── Cart Items ── */}
        {items.map((item) => (
          <CartItemCard
            key={item._id}
            item={item}
            onIncrement={() => addItem(item)}
            onDecrement={() => removeItem(item._id)}
            onDelete={() => removeItem(item._id)}
          />
        ))}

        {/* ── Promo Code ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Apply Promo Code</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={[
                styles.promoInput,
                promoValid === true && styles.promoInputValid,
                promoValid === false && styles.promoInputInvalid,
              ]}
              placeholder="Enter promo code"
              placeholderTextColor={colors.dark + '66'}
              value={promoCode}
              onChangeText={(t) => {
                setPromoCode(t);
                setPromoValid(null);
                setPromoMessage('');
                if (!t.trim()) setDiscount(0);
              }}
              autoCapitalize="characters"
              editable={!promoLoading}
            />
            <TouchableOpacity
              style={[styles.applyBtn, promoLoading && styles.applyBtnDisabled]}
              onPress={handleApplyPromo}
              activeOpacity={0.8}
              disabled={promoLoading}
            >
              {promoLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.applyBtnText}>Apply</Text>
              )}
            </TouchableOpacity>
          </View>
          {!!promoMessage && (
            <Text style={[styles.promoMsg, promoValid ? styles.promoMsgSuccess : styles.promoMsgError]}>
              {promoMessage}
            </Text>
          )}
        </View>

        {/* ── Order Summary ── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rs. {subtotal.toFixed(2)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>
                Discount ({discount}%)
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                − Rs. {discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (6% SST)</Text>
            <Text style={styles.summaryValue}>Rs. {tax.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total.toFixed(2)}</Text>
          </View>
        </View>

        {/* bottom padding for sticky footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky Checkout Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleProceedToCheckout}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
        </TouchableOpacity>
        <Text style={styles.starsCaption}>
          Earn {starsEarned} ⭐ Stars with this order
        </Text>
      </View>

      {/* ── Bottom Nav ── */}
      <BottomNavBar activeTab="Cart" onTabPress={(tab) => {
        if (tab === 'Menu') navigation.navigate('Menu', { screen: 'MenuScreen' });
        else if (tab === 'Home') navigation.navigate('Home', { screen: 'HomeScreen' });
        else if (tab === 'Orders') navigation.navigate('Orders', { screen: 'OrdersScreen' });
        else navigation.navigate(tab);
      }} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // ── Heading ──
  headingRow: {
    marginBottom: spacing.md,
  },
  heading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['2xl'],
    color: colors.dark,
  },
  itemCount: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.55,
    marginTop: 2,
  },

  // ── Item Card ──
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  itemImage: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.card,
    backgroundColor: colors.accent,
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImagePlaceholderText: {
    fontSize: 32,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  itemName: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
    lineHeight: 20,
  },
  itemCustomization: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.55,
    marginTop: 2,
  },
  itemPrice: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
    marginTop: spacing.xs,
  },

  // ── Stepper ──
  stepper: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    lineHeight: 22,
  },
  stepperCount: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginVertical: 4,
    minWidth: 20,
    textAlign: 'center',
  },

  // ── Delete ──
  deleteBtn: {
    padding: spacing.xs,
  },
  deleteBtnIcon: {
    fontSize: 18,
  },

  // ── Promo Code ──
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  promoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  promoInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
    backgroundColor: '#fff',
    letterSpacing: 1,
  },
  promoInputValid: {
    borderColor: '#27ae60',
  },
  promoInputInvalid: {
    borderColor: '#e74c3c',
  },
  applyBtn: {
    height: 48,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
  },
  promoMsg: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
  },
  promoMsgSuccess: {
    color: '#27ae60',
  },
  promoMsgError: {
    color: '#e74c3c',
  },

  // ── Order Summary ──
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
    opacity: 0.7,
  },
  summaryValue: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  discountLabel: {
    color: '#27ae60',
    opacity: 1,
  },
  discountValue: {
    color: '#27ae60',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.accent,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
  },
  totalValue: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },

  // ── Footer ──
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.accent,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
    letterSpacing: 0.5,
  },
  starsCaption: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // ── Empty State ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: fontSizes['5xl'],
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.pill,
  },
  browseBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
  },
});
