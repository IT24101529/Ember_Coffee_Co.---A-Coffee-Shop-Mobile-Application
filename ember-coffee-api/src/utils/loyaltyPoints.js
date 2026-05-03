/** Match app tier cap: no totalPoints above this value. */
export const LOYALTY_POINTS_CAP = 10000;

export function capTotalPoints(points) {
  const n = Number(points);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(0, Math.floor(n)), LOYALTY_POINTS_CAP);
}
