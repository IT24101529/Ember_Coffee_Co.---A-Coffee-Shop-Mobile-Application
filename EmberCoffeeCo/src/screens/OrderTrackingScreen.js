import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import TopAppBar from '../components/ui/TopAppBar';
import BottomNavBar from '../components/ui/BottomNavBar';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';

const TAX_RATE = 0.08;
const POLL_INTERVAL_MS = 30000;
const STORE_PHONE = 'tel:+94771234567';
const STORE_PHONE_URL = 'tel:+94771234567';
const STORE_MAPS_URL = 'https://www.google.com/maps?q=7.2906,80.6337';
const STORE_EMAIL = 'store@embercoffeeco.lk';
const STORE_WEB = 'https://www.embercoffeeco.lk';

const PICKUP_STEPS = ['Pending', 'Brewing', 'Ready'];
const DELIVERY_STEPS = ['Pending', 'Brewing', 'Delivering', 'Delivered'];

const PICKUP_META = {
  Pending: { icon: '📋', label: 'Order Placed',     message: 'Your order has been received', color: '#F39C12' },
  Brewing: { icon: '☕', label: 'Brewing',         message: "We're crafting your order",    color: colors.primary },
  Ready:   { icon: '✅', label: 'Ready for Pickup', message: 'Your order is ready!',          color: '#27AE60' },
};

const DELIVERY_META = {
  Pending:    { icon: '📋', label: 'Order Placed', message: 'Your order has been received',     color: '#F39C12' },
  Brewing:    { icon: '☕', label: 'Brewing',       message: "We're crafting your order",        color: colors.primary },
  Delivering: { icon: '🚚', label: 'Delivering',   message: 'Your order is on the way to you', color: '#1565C0' },
  Delivered:  { icon: '✅', label: 'Delivered',     message: 'Enjoy your order!',                color: '#27AE60' },
};

const PICKUP_TIMES = { Pending: '15–20 min', Brewing: '5–10 min', Ready: 'Ready now' };
const DELIVERY_TIMES = {
  Pending: '15–25 min',
  Brewing: '5–15 min',
  Delivering: '10–30 min',
  Delivered: 'Completed',
};

function trackingStepsForOrder(order) {
  return order?.fulfillmentMethod === 'Delivery' ? DELIVERY_STEPS : PICKUP_STEPS;
}

function statusMetaForOrder(order) {
  return order?.fulfillmentMethod === 'Delivery' ? DELIVERY_META : PICKUP_META;
}

function estimatedTimeForOrder(order) {
  const t = order?.fulfillmentMethod === 'Delivery' ? DELIVERY_TIMES : PICKUP_TIMES;
  return t[order?.orderStatus] || '—';
}

// ─── Progress Tracker ────────────────────────────────────────────────────────
function ProgressTracker({ orderStatus, fulfillmentMethod }) {
  const isDelivery = fulfillmentMethod === 'Delivery';
  const STATUS_STEPS = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS;
  const STATUS_META = isDelivery ? DELIVERY_META : PICKUP_META;
  const currentIdx = STATUS_STEPS.indexOf(orderStatus);
  return (
    <View style={styles.progressContainer}>
      {STATUS_STEPS.map((step, idx) => {
        const meta = STATUS_META[step];
        const isCompleted = idx < currentIdx;
        const isActive    = idx === currentIdx;
        const isPending   = idx > currentIdx;
        return (
          <View key={step} style={styles.progressStepWrapper}>
            {idx > 0 && (
              <View style={[
                styles.connectorLine,
                (isCompleted || isActive) ? styles.connectorLineActive : styles.connectorLinePending,
              ]} />
            )}
            <View style={[
              styles.statusCard,
              isActive  && styles.statusCardActive,
              isPending && styles.statusCardPending,
            ]}>
              <View style={[
                styles.statusIconCircle,
                isCompleted && styles.statusIconCompleted,
                isActive    && { backgroundColor: meta.color },
                isPending   && styles.statusIconPending,
              ]}>
                <Text style={styles.statusIconText}>{meta.icon}</Text>
              </View>
              <View style={styles.statusCardInfo}>
                <Text style={[styles.statusCardLabel, isPending && styles.statusCardLabelMuted]}>
                  {meta.label}
                </Text>
                <Text style={[styles.statusCardDesc, isPending && styles.statusCardDescMuted]}>
                  {meta.message}
                </Text>
              </View>
              {isCompleted && <Text style={styles.statusCheckmark}>✓</Text>}
              {isActive && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen (customer: my orders only; staff use Admin → Order Processing) ─
export default function OrderTrackingScreen({ navigation, route }) {
  const orderIdParam = route.params?.orderId;

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [archivedOrder, setArchivedOrder] = useState(null);
  const [fetchingArchived, setFetchingArchived] = useState(false);
  const [archivedFetchDone, setArchivedFetchDone] = useState(false);
  const pollRef = useRef(null);
  const archivedFetchKeyRef = useRef(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/orders/my`);
      const sorted = [...(data || [])].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setOrders(sorted);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + 30s polling
  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(() => fetchOrders(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchOrders]);

  useEffect(() => {
    archivedFetchKeyRef.current = null;
    setArchivedOrder(null);
    setArchivedFetchDone(!orderIdParam);
    setFetchingArchived(false);
  }, [orderIdParam]);

  useEffect(() => {
    if (!orderIdParam || loading) return;
    const id = String(orderIdParam);
    const inList = orders.some((o) => String(o._id) === id);
    if (inList) {
      setArchivedOrder(null);
      setFetchingArchived(false);
      setArchivedFetchDone(true);
      archivedFetchKeyRef.current = null;
      return;
    }
    if (archivedFetchKeyRef.current === id) return;
    archivedFetchKeyRef.current = id;
    let cancelled = false;
    setFetchingArchived(true);
    setArchivedFetchDone(false);
    axios
      .get(`${BASE_URL}/api/orders/my/order/${id}`)
      .then(({ data }) => {
        if (!cancelled && data && String(data._id) === id) setArchivedOrder(data);
      })
      .catch(() => {
        if (!cancelled) setArchivedOrder(null);
      })
      .finally(() => {
        if (!cancelled) {
          setFetchingArchived(false);
          setArchivedFetchDone(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loading, orderIdParam, orders]);

  const displayOrder = useMemo(() => {
    if (orderIdParam) {
      const fromList = orders.find((o) => String(o._id) === String(orderIdParam));
      if (fromList) return fromList;
      if (archivedOrder && String(archivedOrder._id) === String(orderIdParam)) return archivedOrder;
      return null;
    }
    return orders[0] || null;
  }, [orders, orderIdParam, archivedOrder]);

  const showArchiveSpinner =
    Boolean(orderIdParam) &&
    !orders.some((o) => String(o._id) === String(orderIdParam)) &&
    fetchingArchived;

  const onRefresh = useCallback(() => {
    archivedFetchKeyRef.current = null;
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const handleShare = () => {
    if (!displayOrder) return;
    Alert.alert('Share', `Order #${String(displayOrder._id).slice(-6).toUpperCase()} — ${displayOrder.orderStatus}`);
  };

  const handleCall = () => Linking.openURL(STORE_PHONE_URL).catch(() => Alert.alert('Error', 'Unable to open phone dialler.'));
  const handleDirections = () => Linking.openURL(STORE_MAPS_URL).catch(() => Alert.alert('Error', 'Unable to open maps.'));
  const handleEmail = () =>
    Linking.openURL(`mailto:${STORE_EMAIL}`).catch(() => Alert.alert('Error', 'Unable to open email.'));
  const handleWebsite = () =>
    Linking.openURL(STORE_WEB).catch(() => Alert.alert('Error', 'Unable to open website.'));

  const handleTabPress = (tab) => {
    const map = { Home: 'Home', Menu: 'Menu', Rewards: 'Rewards', Orders: 'Orders', Profile: 'Profile' };
    if (map[tab]) navigation.navigate(map[tab]);
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderOrderItems = (order) => {
    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax      = subtotal * TAX_RATE;
    const total    = subtotal + tax;

    const lineKey = (item, idx) => {
      const ref = item.productId;
      if (ref && typeof ref === 'object' && ref._id) return String(ref._id);
      if (ref) return String(ref);
      return `line-${idx}`;
    };

    const resolveLine = (item) => {
      const p = item.productId || {};
      return {
        name: p.productName || item.productName || 'Product',
        imageUrl: p.productImageUrl || item.productImageUrl || '',
      };
    };

    return (
      <View style={styles.orderDetailsCard}>
        <Text style={styles.sectionHeading}>Your Order</Text>
        {order.items.map((item, idx) => {
          const { name, imageUrl } = resolveLine(item);
          return (
          <View key={lineKey(item, idx)} style={styles.orderItem}>
            {imageUrl
              ? <Image source={{ uri: imageUrl }} style={styles.itemThumb} />
              : <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
                  <Text style={styles.itemThumbIcon}>☕</Text>
                </View>
            }
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>Rs. {(item.price * item.quantity).toFixed(2)}</Text>
          </View>
          );
        })}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>Rs. {subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax (8%)</Text>
          <Text style={styles.summaryValue}>Rs. {tax.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>Rs. {total.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading || showArchiveSpinner) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar title="Order Tracking" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{showArchiveSpinner ? 'Loading order…' : 'Loading orders…'}</Text>
        </View>
        <BottomNavBar activeTab="Orders" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar title="Order Tracking" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchOrders()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar activeTab="Orders" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  // ── Missing order (bad id or not in your history) ───────────────────────────
  if (orderIdParam && !displayOrder && archivedFetchDone) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar title="Order Tracking" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>We could not find this order in your history.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.navigate('Orders', { screen: 'OrdersScreen' })}
            activeOpacity={0.85}
          >
            <Text style={styles.retryBtnText}>Back to My Orders</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar activeTab="Orders" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  // ── No orders ───────────────────────────────────────────────────────────────
  if (!displayOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar title="Order Tracking" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>☕</Text>
          <Text style={styles.emptyHeading}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Place your first order to track it here.</Text>
          <TouchableOpacity
            style={styles.startOrderingBtn}
            onPress={() => navigation.navigate('Menu')}
            activeOpacity={0.8}
          >
            <Text style={styles.startOrderingBtnText}>Start Ordering</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar activeTab="Orders" onTabPress={handleTabPress} />
      </SafeAreaView>
    );
  }

  const statusMetaMap = statusMetaForOrder(displayOrder);
  const CANCELLED_META = { icon: '❌', label: 'Cancelled', message: 'This order was cancelled.', color: '#E74C3C' };
  const meta = displayOrder.orderStatus === 'Cancelled' ? CANCELLED_META : (statusMetaMap[displayOrder.orderStatus] || statusMetaMap.Pending);
  const orderNum  = String(displayOrder._id).slice(-6).toUpperCase();
  const estTime   = estimatedTimeForOrder(displayOrder);
  const fulfillmentMethod = displayOrder.fulfillmentMethod === 'Delivery' ? 'Delivery' : 'Pickup';

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Order Tracking"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.shareIcon}>⬆</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero status ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroOrderLabel}>
            Order #{orderNum}
            {displayOrder.orderStatus === 'Delivered' || displayOrder.orderStatus === 'Ready'
              ? ' • Completed'
              : ' • In progress'}
          </Text>
          <Text style={styles.heroStatusMessage}>{meta.message}</Text>
          <View style={styles.heroEstRow}>
            <Text style={styles.clockIcon}>🕐</Text>
            <Text style={styles.heroEstText}>Estimated: {estTime}</Text>
          </View>
        </View>

        {/* ── Progress tracker ── */}
        <ProgressTracker
          orderStatus={displayOrder.orderStatus}
          fulfillmentMethod={fulfillmentMethod}
        />

        {/* ── Order details ── */}
        {renderOrderItems(displayOrder)}

        {/* ── Interaction grid ── */}
        <View style={styles.interactionGrid}>
          <TouchableOpacity style={styles.interactionBtn} onPress={handleCall} activeOpacity={0.8}>
            <Text style={styles.interactionIcon}>📞</Text>
            <Text style={styles.interactionLabel}>Call Store</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.interactionBtn} onPress={handleDirections} activeOpacity={0.8}>
            <Text style={styles.interactionIcon}>🗺</Text>
            <Text style={styles.interactionLabel}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cancel Order Button ── */}
        {displayOrder.orderStatus === 'Pending' && (
          <TouchableOpacity 
            style={[styles.interactionBtn, { marginTop: spacing.md, backgroundColor: '#FFEBEE' }]} 
            onPress={() => {
              Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
                { text: 'Keep Order', style: 'cancel' },
                { 
                  text: 'Cancel Order', 
                  style: 'destructive', 
                  onPress: async () => {
                    try {
                      await axios.put(`${BASE_URL}/api/orders/my/order/${displayOrder._id}/cancel`, {});
                      Alert.alert('Order Cancelled', 'Your order has been cancelled.');
                      fetchOrders(true);
                      if (archivedFetchKeyRef.current) {
                        setArchivedOrder(null);
                        archivedFetchKeyRef.current = null;
                        onRefresh();
                      }
                    } catch (err) {
                      Alert.alert('Error', err.response?.data?.message || 'Could not cancel order.');
                    }
                  } 
                }
              ]);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.interactionIcon, { fontSize: 20 }]}>❌</Text>
            <Text style={[styles.interactionLabel, { color: '#D32F2F' }]}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        {/* ── Flagship store details ── */}
        <View style={styles.storeDetailsCard}>
          <Text style={styles.storeDetailsTitle}>Ember Coffee Co. — Flagship Store</Text>

          <Text style={styles.storeSectionHeading}>Address</Text>
          <Text style={styles.storeBodyText}>
            45 Peradeniya Road{'\n'}Kandy, 20000{'\n'}Sri Lanka
          </Text>

          <Text style={styles.storeSectionHeading}>Contact</Text>
          <Text style={styles.storeBodyText}>Phone: {STORE_PHONE}</Text>
          <TouchableOpacity onPress={handleEmail} activeOpacity={0.7}>
            <Text style={styles.storeLink}>Email: {STORE_EMAIL}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWebsite} activeOpacity={0.7}>
            <Text style={styles.storeLink}>Website: www.embercoffeeco.lk</Text>
          </TouchableOpacity>

          <Text style={styles.storeSectionHeading}>Business hours</Text>
          <Text style={styles.storeBodyText}>
            Monday – Friday: 7:00 AM – 9:00 PM{'\n'}
            Saturday & Sunday: 8:00 AM – 10:00 PM
          </Text>

          <Text style={styles.storeSectionHeading}>Location & notes</Text>
          <Text style={styles.storeBodyText}>
            Coordinates: 7.2906° N, 80.6337° E{'\n'}
            Store manager: Mr. Ranasinghe{'\n'}
            Parking: Limited street parking; dedicated lot at the rear.
          </Text>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <BottomNavBar activeTab="Orders" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.6,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  retryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: '#fff',
  },

  // ── Share / refresh icons ──
  shareIcon: {
    fontSize: 20,
    color: colors.dark,
  },
  // ── Hero card ──
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroOrderLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  heroStatusMessage: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['2xl'],
    color: '#fff',
    marginBottom: spacing.sm,
  },
  heroEstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  clockIcon: {
    fontSize: 14,
  },
  heroEstText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Progress tracker ──
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressStepWrapper: {
    flexDirection: 'column',
  },
  connectorLine: {
    width: 2,
    height: 20,
    marginLeft: 23,
    marginVertical: 2,
  },
  connectorLineActive: {
    backgroundColor: colors.primary,
  },
  connectorLinePending: {
    backgroundColor: '#E0E0E0',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.card,
    gap: spacing.sm,
  },
  statusCardActive: {
    backgroundColor: colors.accent + '44',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  statusCardPending: {
    opacity: 0.45,
  },
  statusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconCompleted: {
    backgroundColor: '#27AE60',
  },
  statusIconPending: {
    backgroundColor: '#E0E0E0',
  },
  statusIconText: {
    fontSize: 20,
  },
  statusCardInfo: {
    flex: 1,
  },
  statusCardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  statusCardLabelMuted: {
    color: '#9E9E9E',
  },
  statusCardDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.7,
    marginTop: 2,
  },
  statusCardDescMuted: {
    color: '#BDBDBD',
  },
  statusCheckmark: {
    fontSize: 18,
    color: '#27AE60',
    fontWeight: 'bold',
  },
  activePill: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  activePillText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#fff',
  },

  // ── Order details card ──
  orderDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.input,
    backgroundColor: colors.accent,
  },
  itemThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumbIcon: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  itemQty: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.6,
    marginTop: 2,
  },
  itemPrice: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.7,
  },
  summaryValue: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  summaryTotal: {
    marginTop: spacing.xs,
  },
  summaryTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  summaryTotalValue: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.primary,
  },

  // ── Interaction grid ──
  interactionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  interactionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  interactionIcon: {
    fontSize: 24,
  },
  interactionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },

  // ── Store details ──
  storeDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  storeDetailsTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.dark,
    marginBottom: spacing.md,
  },
  storeSectionHeading: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  storeBodyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.85,
    lineHeight: 22,
  },
  storeLink: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.primary,
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
  },

  // ── Empty state ──
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyHeading: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.dark,
    opacity: 0.6,
    textAlign: 'center',
  },
  startOrderingBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.pill,
  },
  startOrderingBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: '#fff',
  },
});
