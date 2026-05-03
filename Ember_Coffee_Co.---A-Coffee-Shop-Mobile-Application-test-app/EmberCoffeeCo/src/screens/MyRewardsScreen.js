import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import colors from '../theme/colors';
import spacing, { borderRadius } from '../theme/spacing';
import { fonts, fontSizes } from '../theme/typography';
import { effectiveLoyaltyPoints, getRewardsTierInfo } from '../utils/loyaltyTier';

// ─── Circular Progress ────────────────────────────────────────────────────────
// Custom implementation using two half-circle clips — no extra dependencies.

const CIRCLE_SIZE = 140;
const STROKE = 12;

function CircularProgress({ progress, displayPoints }) {
  const pct = Math.min(Math.max(progress, 0), 1);
  const deg = pct * 360;

  // We render two half-circle "slices" to simulate a progress arc.
  // Left half fills when progress > 50%, right half always fills first.
  const rightDeg = Math.min(deg, 180);
  const leftDeg  = Math.max(deg - 180, 0);

  return (
    <View style={cp.wrapper}>
      {/* Track */}
      <View style={cp.track} />

      {/* Right half (0–180°) */}
      <View style={[cp.halfClip, cp.rightClip]}>
        <View
          style={[
            cp.halfCircle,
            cp.rightHalf,
            { transform: [{ rotate: `${rightDeg}deg` }] },
          ]}
        />
      </View>

      {/* Left half (180–360°) */}
      <View style={[cp.halfClip, cp.leftClip]}>
        <View
          style={[
            cp.halfCircle,
            cp.leftHalf,
            { transform: [{ rotate: `${leftDeg}deg` }] },
          ]}
        />
      </View>

      <View style={cp.centre}>
        <Text style={cp.pointsValue}>{displayPoints}</Text>
        <Text style={cp.pointsLabel}>pts</Text>
      </View>
    </View>
  );
}

const R = CIRCLE_SIZE / 2;

const cp = StyleSheet.create({
  wrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  track: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: R,
    borderWidth: STROKE,
    borderColor: colors.accent,
  },
  halfClip: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    overflow: 'hidden',
  },
  rightClip: {
    left: R,
    width: R,
  },
  leftClip: {
    left: 0,
    width: R,
    overflow: 'hidden',
  },
  halfCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: R,
    borderWidth: STROKE,
    borderColor: colors.primary,
  },
  rightHalf: {
    left: -R,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transformOrigin: `${R}px ${R}px`,
  },
  leftHalf: {
    left: 0,
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    transformOrigin: `${R}px ${R}px`,
  },
  centre: {
    position: 'absolute',
    width: CIRCLE_SIZE - STROKE * 2,
    height: CIRCLE_SIZE - STROKE * 2,
    top: STROKE,
    left: STROKE,
    borderRadius: R - STROKE,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    color: colors.primary,
  },
  pointsLabel: {
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.6,
    marginTop: -2,
  },
});

// ─── Reward Card ──────────────────────────────────────────────────────────────

function RewardCard({ reward, userPoints, onRedeem, redeeming }) {
  const isLocked = reward.locked;
  const canRedeem = userPoints >= reward.pointsRequired && !isLocked;

  return (
    <View style={styles.card}>
      {reward.rewardImageUrl ? (
        <Image source={{ uri: reward.rewardImageUrl }} style={styles.rewardImage} />
      ) : (
        <View style={[styles.rewardImage, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>🎁</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.rewardName}>{reward.rewardName}</Text>
        {reward.description ? (
          <Text style={styles.rewardDesc} numberOfLines={2}>{reward.description}</Text>
        ) : null}
        <Text style={styles.pointsRequired}>{reward.pointsRequired} pts required</Text>
      </View>
      <TouchableOpacity
        style={[styles.redeemBtn, (!canRedeem || isLocked) && styles.redeemBtnDisabled]}
        onPress={() => canRedeem && onRedeem(reward)}
        disabled={!canRedeem || redeeming === reward._id || isLocked}
        activeOpacity={0.8}
      >
        {redeeming === reward._id ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.redeemBtnText}>
            {isLocked ? 'Cooldown' : (userPoints >= reward.pointsRequired ? 'Redeem' : 'Need more pts')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────────

function HistoryCard({ item }) {
  const reward = item.rewardId;
  const date = new Date(item.redeemedAt || item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <View style={styles.card}>
      {reward?.rewardImageUrl ? (
        <Image source={{ uri: reward.rewardImageUrl }} style={styles.rewardImage} />
      ) : (
        <View style={[styles.rewardImage, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>🎁</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.rewardName}>{reward?.rewardName || 'Unknown Reward'}</Text>
        <Text style={styles.rewardDesc}>{date}</Text>
      </View>
      <View style={[styles.redeemBtn, { backgroundColor: '#E0E0E0' }]}>
        <Text style={[styles.redeemBtnText, { color: colors.dark }]}>-{item.pointsUsed} pts</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyRewardsScreen() {
  const { user } = useAuth();

  const [rewards, setRewards]     = useState([]);
  const [history, setHistory]     = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [totalPoints, setTotalPoints] = useState(user?.totalPoints ?? 0);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState(null); // reward._id being redeemed

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [rewardsRes, profileRes, historyRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/api/rewards`),
        axios.get(`${BASE_URL}/api/auth/profile`),
        axios.get(`${BASE_URL}/api/rewards/history`),
      ]);
      
      if (rewardsRes.status === 'fulfilled') {
        const data = rewardsRes.value.data;
        
        let historyData = [];
        if (historyRes.status === 'fulfilled') historyData = historyRes.value.data;

        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        const recentRedeemedSet = new Set(
          historyData
            .filter(h => new Date(h.redeemedAt || h.createdAt) > twoMonthsAgo)
            .map(h => String(h.rewardId?._id || h.rewardId))
        );

        setRewards(
          Array.isArray(data)
            ? data.filter(r => r.isAvailable !== false).map(r => ({
                ...r,
                locked: recentRedeemedSet.has(String(r._id)),
              }))
            : []
        );
      } else {
        throw new Error('Rewards failed to load');
      }
      
      if (profileRes.status === 'fulfilled') {
        setTotalPoints(profileRes.value.data.totalPoints ?? 0);
      }
      
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data);
      } else {
        console.warn('History failed to load. Are backend updates deployed?');
        setHistory([]);
      }
      
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load rewards.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRedeem = async (reward) => {
    Alert.alert(
      'Redeem Reward',
      `Redeem "${reward.rewardName}" for ${reward.pointsRequired} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setRedeeming(reward._id);
            try {
              const res = await axios.post(`${BASE_URL}/api/rewards/${reward._id}/redeem`);
              setTotalPoints(res.data.totalPoints);
              fetchData();
              Alert.alert('Redeemed!', `You redeemed "${reward.rewardName}". Please visit our nearest Ember Coffee Co. shop to collect your reward.`);
            } catch (err) {
              const msg = err?.response?.data?.message;
              Alert.alert('Error', msg || 'Redemption failed.');
            } finally {
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const cappedPoints = effectiveLoyaltyPoints(totalPoints);
  const tierRing = getRewardsTierInfo(totalPoints);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={activeTab === 'available' ? rewards : history}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          activeTab === 'available' ? (
            <RewardCard
              reward={item}
              userPoints={cappedPoints}
              onRedeem={handleRedeem}
              redeeming={redeeming}
            />
          ) : (
            <HistoryCard item={item} />
          )
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Rewards</Text>
            <CircularProgress progress={tierRing.progress} displayPoints={cappedPoints} />
            <Text style={styles.pointsSubtitle}>loyalty points</Text>
            
            <View style={styles.tabContainer}>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'available' && styles.tabBtnActive]} onPress={() => setActiveTab('available')}>
                <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>Available</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]} onPress={() => setActiveTab('history')}>
                <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>View History</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{activeTab === 'available' ? 'No rewards available right now.' : 'No redeemed items yet.'}</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  pointsSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.5,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0EBE6',
    borderRadius: borderRadius.pill,
    padding: 4,
    marginTop: spacing.md,
    width: '100%',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.pill,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.semiBold,
    color: colors.dark,
    opacity: 0.7,
  },
  tabTextActive: {
    color: '#fff',
    opacity: 1,
  },

  // ── Reward Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  rewardImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.input,
    marginRight: spacing.md,
  },
  imagePlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rewardName: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.dark,
  },
  rewardDesc: {
    fontSize: fontSizes.sm,
    color: colors.dark,
    opacity: 0.6,
    marginTop: 2,
  },
  pointsRequired: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  // ── Redeem Button ──
  redeemBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    minWidth: 80,
    alignItems: 'center',
  },
  redeemBtnDisabled: {
    backgroundColor: '#ccc',
  },
  redeemBtnText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },

  // ── Empty ──
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: spacing.xl,
    fontSize: fontSizes.base,
  },
});
