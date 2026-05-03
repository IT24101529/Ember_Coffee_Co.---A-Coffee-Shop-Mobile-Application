import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import colors from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';
import spacing, { borderRadius } from '../theme/spacing';
import TopAppBar from '../components/ui/TopAppBar';
import BottomNavBar from '../components/ui/BottomNavBar';
import { getRewardsTierInfo } from '../utils/loyaltyTier';

// ─── Circular Progress ───────────────────────────────────────────────────────

const CIRCLE_SIZE = 256;
const TRACK_WIDTH = 18;

function CircularProgress({ points, tierInfo }) {
  const pct = tierInfo.progress;
  const deg = pct * 360;
  const rightDeg = Math.min(deg, 180);
  const leftDeg  = Math.max(deg - 180, 0);

  return (
    <View style={cp.wrapper}>
      {/* Track ring */}
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

      {/* Centre content */}
      <View style={cp.centre}>
        <Text style={cp.tierLabel}>{tierInfo.name}</Text>
        <Text style={cp.pointsValue}>{points}</Text>
        <Text style={cp.starsLabel}>Stars</Text>
      </View>
    </View>
  );
}

const cp = StyleSheet.create({
  wrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignSelf: 'center',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: TRACK_WIDTH,
    borderColor: 'rgba(98,55,30,0.12)',
  },
  halfClip: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    overflow: 'hidden',
  },
  rightClip: {
    left: CIRCLE_SIZE / 2,
  },
  leftClip: {
    right: CIRCLE_SIZE / 2,
  },
  halfCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: TRACK_WIDTH,
    borderColor: colors.primary,
  },
  rightHalf: {
    left: -CIRCLE_SIZE / 2,
    transformOrigin: `${CIRCLE_SIZE / 2}px ${CIRCLE_SIZE / 2}px`,
  },
  leftHalf: {
    right: -CIRCLE_SIZE / 2,
    transformOrigin: `${CIRCLE_SIZE / 2}px ${CIRCLE_SIZE / 2}px`,
  },
  centre: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    letterSpacing: 0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  pointsValue: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes['5xl'],
    color: colors.dark,
    lineHeight: fontSizes['5xl'] + 4,
  },
  starsLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(46,21,0,0.55)',
    marginTop: 2,
  },
});

// ─── Tier Info Card ───────────────────────────────────────────────────────────

function TierInfoCard({ tierInfo, onViewHistory }) {
  return (
    <View style={styles.tierCard}>
      <View style={styles.tierCardLeft}>
        <Text style={styles.tierCardName}>{tierInfo.name}</Text>
        <Text style={styles.tierCardDesc}>{tierInfo.description}</Text>
      </View>
      <TouchableOpacity onPress={onViewHistory} activeOpacity={0.7}>
        <Text style={styles.viewHistoryLink}>View History</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Reward Card ─────────────────────────────────────────────────────────────

function RewardCard({ reward, userPoints, onRedeem, redeeming, featured = false }) {
  const isLocked = reward.locked;
  const canRedeem = userPoints >= (reward.pointsRequired || 0) && !isLocked;
  const isRedeeming = redeeming === reward._id;

  return (
    <View style={[styles.rewardCard, featured && styles.rewardCardFeatured]}>
      {/* Image */}
      <View style={[styles.rewardImageWrap, featured && styles.rewardImageWrapFeatured]}>
        {reward.rewardImageUrl ? (
          <Image
            source={{ uri: reward.rewardImageUrl }}
            style={[styles.rewardImage, featured && styles.rewardImageFeatured]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.rewardImagePlaceholder, featured && styles.rewardImageFeatured]}>
            <Text style={styles.rewardImagePlaceholderIcon}>🎁</Text>
          </View>
        )}

        {/* Stars badge top-right */}
        <View style={styles.starsBadge}>
          <Text style={styles.starsBadgeText}>⭐ {reward.pointsRequired} Stars</Text>
        </View>

        {/* Most Popular badge for featured */}
        {featured && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.rewardContent}>
        <Text style={styles.rewardName} numberOfLines={1}>
          {reward.rewardName || reward.name || 'Reward'}
        </Text>
        <Text style={styles.rewardDesc} numberOfLines={2}>
          {reward.description || 'Redeem this reward with your stars.'}
        </Text>

        <TouchableOpacity
          style={[styles.redeemBtn, (!canRedeem || isLocked) && styles.redeemBtnDisabled]}
          onPress={() => canRedeem && onRedeem(reward)}
          disabled={!canRedeem || isRedeeming || isLocked}
          activeOpacity={0.8}
        >
          {isRedeeming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.redeemBtnText, (!canRedeem || isLocked) && styles.redeemBtnTextDisabled]}>
              {isLocked ? 'Wait 60 Days' : (userPoints >= (reward.pointsRequired || 0) ? 'Redeem' : 'Not enough stars')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Earn More Stars Banner ───────────────────────────────────────────────────

function EarnMoreBanner({ onOrderNow }) {
  return (
    <View style={styles.earnBanner}>
      <View style={styles.earnBannerContent}>
        <Text style={styles.earnBannerHeading}>Earn More Stars</Text>
        <Text style={styles.earnBannerDesc}>
          Every order earns you stars. Keep brewing to unlock exclusive rewards.
        </Text>
        <TouchableOpacity
          style={styles.orderNowBtn}
          onPress={onOrderNow}
          activeOpacity={0.85}
        >
          <Text style={styles.orderNowBtnText}>Order Now</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.earnBannerEmoji}>☕</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function RewardsScreen({ navigation }) {
  const { token } = useAuth();

  const [rewards, setRewards]         = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [redeeming, setRedeeming]     = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [rewardsRes, profileRes, historyRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/api/rewards`),
        axios.get(`${BASE_URL}/api/auth/profile`, { headers }),
        axios.get(`${BASE_URL}/api/rewards/history`, { headers }),
      ]);

      let historyData = [];
      if (historyRes.status === 'fulfilled') {
        historyData = historyRes.value.data;
      }
      
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      const recentRedeemedSet = new Set(
        historyData
          .filter(h => new Date(h.redeemedAt || h.createdAt) > twoMonthsAgo)
          .map(h => String(h.rewardId?._id || h.rewardId))
      );

      if (rewardsRes.status === 'fulfilled') {
        const data = rewardsRes.value.data;
        setRewards(
          Array.isArray(data)
            ? data.filter(r => r.isAvailable !== false).map(r => ({
                ...r,
                locked: recentRedeemedSet.has(String(r._id)),
              }))
            : []
        );
      }

      if (profileRes.status === 'fulfilled') {
        setTotalPoints(profileRes.value.data?.totalPoints ?? 0);
      }
    } catch (_) {
      // graceful degradation
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  const handleRedeem = async (reward) => {
    Alert.alert(
      'Redeem Reward',
      `Redeem "${reward.rewardName || reward.name}" for ${reward.pointsRequired} stars?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setRedeeming(reward._id);
            try {
              const res = await axios.post(
                `${BASE_URL}/api/rewards/${reward._id}/redeem`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
              );
              setTotalPoints(res.data.totalPoints ?? totalPoints);
              fetchData();
              Alert.alert('🎉 Redeemed!', `You redeemed "${reward.rewardName || reward.name}" successfully. Please visit our nearest Ember Coffee Co. shop to collect your reward.`);
            } catch (err) {
              const status = err?.response?.status;
              const msg = err?.response?.data?.message;
              if (status === 400) {
                Alert.alert(msg && msg.includes('60 days') ? 'Already Redeemed' : 'Not enough stars', msg || 'You do not have enough stars for this reward.');
              } else {
                Alert.alert('Error', err?.response?.data?.message || 'Redemption failed. Please try again.');
              }
            } finally {
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  const handleTabPress = (tab) => {
    const map = { Home: 'Home', Menu: 'Menu', Rewards: 'Rewards', Orders: 'Orders', Profile: 'Profile' };
    if (map[tab] && tab !== 'Rewards') navigation?.navigate(map[tab]);
  };

  const tierInfo = getRewardsTierInfo(totalPoints);

  // Split rewards into bento grid: first 2 normal, rest featured
  const card1 = rewards[0] || null;
  const card2 = rewards[1] || null;
  const card3 = rewards[2] || null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      {/* Top App Bar */}
      <TopAppBar
        title="My Rewards"
      />

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
          {/* ── Hero: Circular Progress ── */}
          <View style={styles.heroSection}>
            <CircularProgress points={tierInfo.displayPoints} tierInfo={tierInfo} />
          </View>

          {/* ── Tier Info Card ── */}
          <TierInfoCard
            tierInfo={tierInfo}
            onViewHistory={() => navigation?.navigate('MyRewards')}
          />

          {/* ── Available Rewards Heading ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Rewards</Text>
            <Text style={styles.rewardsCount}>{rewards.length} rewards</Text>
          </View>

          {/* ── Bento Grid Rewards ── */}
          {rewards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎁</Text>
              <Text style={styles.emptyTitle}>No rewards available yet</Text>
              <Text style={styles.emptyText}>
                Check back soon — new rewards are on their way.
              </Text>
            </View>
          ) : (
            <View style={styles.bentoGrid}>
              {/* Card 1 */}
              {card1 && (
                <RewardCard
                  reward={card1}
                  userPoints={tierInfo.displayPoints}
                  onRedeem={handleRedeem}
                  redeeming={redeeming}
                />
              )}

              {/* Card 2 */}
              {card2 && (
                <RewardCard
                  reward={card2}
                  userPoints={tierInfo.displayPoints}
                  onRedeem={handleRedeem}
                  redeeming={redeeming}
                />
              )}

              {/* Card 3 — Featured Wide */}
              {card3 && (
                <RewardCard
                  reward={card3}
                  userPoints={tierInfo.displayPoints}
                  onRedeem={handleRedeem}
                  redeeming={redeeming}
                  featured
                />
              )}

              {/* Remaining rewards */}
              {rewards.slice(3).map((reward) => (
                <RewardCard
                  key={reward._id}
                  reward={reward}
                  userPoints={tierInfo.displayPoints}
                  onRedeem={handleRedeem}
                  redeeming={redeeming}
                />
              ))}
            </View>
          )}

          {/* ── Earn More Stars Banner ── */}
          <EarnMoreBanner onOrderNow={() => navigation?.navigate('Menu')} />

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <BottomNavBar activeTab="Rewards" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  notifIcon: {
    fontSize: 20,
  },

  // ── Hero Section ──
  heroSection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.cream,
  },

  // ── Tier Info Card ──
  tierCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.cardLg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  tierCardLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  tierCardName: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginBottom: 4,
  },
  tierCardDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(46,21,0,0.6)',
    lineHeight: 18,
  },
  viewHistoryLink: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
  },
  rewardsCount: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(46,21,0,0.5)',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    marginHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.dark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: 'rgba(46,21,0,0.5)',
    textAlign: 'center',
  },

  // ── Bento Grid ──
  bentoGrid: {
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // ── Reward Card ──
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.cardLg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  rewardCardFeatured: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  rewardImageWrap: {
    position: 'relative',
    height: 160,
  },
  rewardImageWrapFeatured: {
    height: 200,
  },
  rewardImage: {
    width: '100%',
    height: '100%',
  },
  rewardImageFeatured: {
    width: '100%',
    height: '100%',
  },
  rewardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardImagePlaceholderIcon: {
    fontSize: 48,
  },
  starsBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.dark,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  starsBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  popularBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  rewardContent: {
    padding: spacing.md,
  },
  rewardName: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    marginBottom: 4,
  },
  rewardDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(46,21,0,0.6)',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  redeemBtn: {
    height: 44,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  redeemBtnDisabled: {
    backgroundColor: 'rgba(98,55,30,0.2)',
  },
  redeemBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  redeemBtnTextDisabled: {
    color: 'rgba(46,21,0,0.45)',
  },

  // ── Earn More Stars Banner ──
  earnBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.cardLg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  earnBannerContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  earnBannerHeading: {
    fontFamily: fonts.extraBold,
    fontSize: fontSizes.xl,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  earnBannerDesc: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  orderNowBtn: {
    height: 40,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  orderNowBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
    letterSpacing: 0.3,
  },
  earnBannerEmoji: {
    fontSize: 48,
    opacity: 0.9,
  },
});
