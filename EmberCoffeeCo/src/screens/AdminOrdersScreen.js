import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import TopAppBar from '../components/ui/TopAppBar';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';

export default function AdminOrdersScreen({ navigation }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId, currentStatus, fulfillmentMethod, forceStatus = null) => {
    try {
      let nextStatus;
      if (forceStatus) {
        nextStatus = forceStatus;
      } else {
        const sequence = fulfillmentMethod === 'Delivery' 
          ? ['Pending', 'Brewing', 'Delivering', 'Delivered'] 
          : ['Pending', 'Brewing', 'Ready'];
        
        const currentIndex = sequence.indexOf(currentStatus);
        if (currentIndex === -1 || currentIndex === sequence.length - 1) return;
        
        nextStatus = sequence[currentIndex + 1];
      }

      await axios.put(
        `${BASE_URL}/api/orders/${orderId}/status`,
        { orderStatus: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
    }
  };

  const renderOrder = ({ item }) => {
    const isDelivery = item.fulfillmentMethod === 'Delivery';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{item._id.slice(-6).toUpperCase()}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: item.orderStatus === 'Cancelled' ? '#E74C3C' : item.orderStatus === 'Pending' ? '#F2994A' : '#27AE60' }
          ]}>
            <Text style={styles.statusText}>{item.orderStatus}</Text>
          </View>
        </View>

        <Text style={styles.customerName}>Customer: {item.userId?.name || 'Unknown'}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>{isDelivery ? '🚚' : '🏪'}</Text>
          <Text style={styles.infoText}>{item.fulfillmentMethod} · {item.paymentMethod}</Text>
        </View>

        {isDelivery && item.deliveryAddress ? (
          <View style={styles.addressBox}>
            <Text style={styles.addressLabel}>Delivery Address:</Text>
            <Text style={styles.addressText}>{item.deliveryAddress}</Text>
          </View>
        ) : null}

        <Text style={styles.totalAmount}>Total: Rs. {Number(item.totalAmount).toFixed(2)}</Text>

        <View style={styles.actionRow}>
          {item.orderStatus !== 'Cancelled' && item.orderStatus !== 'Delivered' && item.orderStatus !== 'Ready' && (
            <TouchableOpacity 
              style={[styles.updateBtn, { backgroundColor: '#E74C3C' }]} 
              onPress={() => handleStatusUpdate(item._id, item.orderStatus, item.fulfillmentMethod, 'Cancelled')}
            >
              <Text style={styles.updateBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {item.orderStatus !== 'Cancelled' && item.orderStatus !== 'Delivered' && item.orderStatus !== 'Ready' && (
            <TouchableOpacity 
              style={[styles.updateBtn, { flex: 2 }]} 
              onPress={() => handleStatusUpdate(item._id, item.orderStatus, item.fulfillmentMethod)}
            >
              <Text style={styles.updateBtnText}>Advance Status</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopAppBar title="Order Processing" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No orders found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderId: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
    color: '#fff',
  },
  customerName: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  addressBox: {
    backgroundColor: '#F9F9F9',
    padding: spacing.sm,
    borderRadius: borderRadius.card,
    marginBottom: spacing.sm,
  },
  addressLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
    color: colors.dark,
    opacity: 0.7,
  },
  addressText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginTop: 2,
  },
  totalAmount: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  updateBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
  },
  updateBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
    opacity: 0.6,
    marginTop: spacing.xl,
  }
});
