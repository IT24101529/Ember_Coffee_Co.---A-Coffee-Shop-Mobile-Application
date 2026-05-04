/**
 * Single source of truth for loyalty tiers and the 10,000 point cap.
 * Bronze 0–999, Silver 1000–2499, Gold 2500–4999, Platinum 5000–10000 (no points above cap).
 */

export const LOYALTY_POINTS_CAP = 10000;

export function effectiveLoyaltyPoints(points) {
  const n = Number(points);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), LOYALTY_POINTS_CAP);
}

/** Short label for home / stats (no "Member" suffix) */
export function getTierShortName(points) {
  const p = effectiveLoyaltyPoints(points);
  if (p >= 5000) return 'Platinum';
  if (p >= 2500) return 'Gold';
  if (p >= 1000) return 'Silver';
  return 'Bronze';
}

/** Milestones for home “brew journey” (must stay sorted by points ascending) */
export const LOYALTY_MILESTONES = [
  { icon: '🥉', label: 'Bronze', points: 0 },
  { icon: '🥈', label: 'Silver', points: 1000 },
  { icon: '🥇', label: 'Gold', points: 2500 },
  { icon: '💎', label: 'Platinum', points: 5000 },
];

/**
 * Progress 0–1 toward the next milestone; 1 when at or past cap or last tier ceiling.
 */
export function getHomeJourneyProgress(points) {
  const totalPoints = effectiveLoyaltyPoints(points);
  const nextMilestone = LOYALTY_MILESTONES.find((m) => m.points > totalPoints);
  if (!nextMilestone) return 1;
  const prevPoints =
    [...LOYALTY_MILESTONES].filter((m) => m.points < nextMilestone.points).pop()?.points ?? 0;
  const span = nextMilestone.points - prevPoints;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (totalPoints - prevPoints) / span));
}

const REWARD_TIERS = [
  { name: 'Bronze Member', min: 0, maxExclusive: 1000, color: '#CD7F32' },
  { name: 'Silver Member', min: 1000, maxExclusive: 2500, color: '#A8A9AD' },
  { name: 'Gold Member', min: 2500, maxExclusive: 5000, color: '#FFD700' },
  { name: 'Platinum Member', min: 5000, maxExclusive: LOYALTY_POINTS_CAP + 1, color: '#E5E4E2' },
];

/**
 * Rewards screen: tier band, ring progress, copy (uses capped points).
 */
export function getRewardsTierInfo(rawPoints) {
  const points = effectiveLoyaltyPoints(rawPoints);
  const tier =
    REWARD_TIERS.find((t) => points >= t.min && points < t.maxExclusive) || REWARD_TIERS[REWARD_TIERS.length - 1];
  const idx = REWARD_TIERS.indexOf(tier);
  const isCapped = points >= LOYALTY_POINTS_CAP;
  const isPlatinumBand = tier === REWARD_TIERS[REWARD_TIERS.length - 1];
  const span = tier.maxExclusive - tier.min;
  const progress =
    isCapped || span <= 0 ? 1 : Math.min(1, (points - tier.min) / span);
  const nextTier = REWARD_TIERS[idx + 1];
  let description;
  if (isCapped) {
    description =
      'You have reached the maximum 10,000 points. No further points can be earned. Enjoy Platinum perks!';
  } else if (isPlatinumBand) {
    const need = LOYALTY_POINTS_CAP - points;
    description = `Earn ${need} more stars to reach the maximum ${LOYALTY_POINTS_CAP.toLocaleString()} points.`;
  } else if (!nextTier) {
    description = 'You have reached the highest tier. Enjoy exclusive Platinum perks!';
  } else {
    const need = nextTier.min - points;
    description = `Earn ${need} more stars to reach ${nextTier.name}.`;
  }
  return {
    ...tier,
    progress,
    nextTierPoints: isCapped ? null : nextTier?.min ?? null,
    description,
    displayPoints: points,
  };
}

/**
 * Profile card: short tier name, next threshold, bar progress within current band.
 */
export function getProfileTierInfo(rawPoints) {
  const points = effectiveLoyaltyPoints(rawPoints);
  if (points >= LOYALTY_POINTS_CAP) {
    return { name: 'Platinum', next: null, progress: 1, displayPoints: points };
  }
  if (points >= 5000) {
    return {
      name: 'Platinum',
      next: LOYALTY_POINTS_CAP,
      progress: (points - 5000) / (LOYALTY_POINTS_CAP - 5000),
      displayPoints: points,
    };
  }
  if (points >= 2500) {
    return {
      name: 'Gold',
      next: 5000,
      progress: (points - 2500) / (5000 - 2500),
      displayPoints: points,
    };
  }
  if (points >= 1000) {
    return {
      name: 'Silver',
      next: 2500,
      progress: (points - 1000) / (2500 - 1000),
      displayPoints: points,
    };
  }
  return {
    name: 'Bronze',
    next: 1000,
    progress: points / 1000,
    displayPoints: points,
  };
}
