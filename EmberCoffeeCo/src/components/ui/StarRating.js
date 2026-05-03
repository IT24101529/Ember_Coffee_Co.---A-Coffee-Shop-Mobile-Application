import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

// Size variants: 'small' = 10px, 'large' = 28px, or pass a number directly
const SIZE_MAP = { small: 10, large: 28 };

/**
 * StarRating component
 * - rating: number 1–5 (display value)
 * - onRate: optional callback(rating) — makes stars tappable
 * - size: 'small' | 'large' | number (default 20)
 */
export default function StarRating({ rating = 0, onRate, size = 20 }) {
  const resolvedSize = typeof size === 'string' ? (SIZE_MAP[size] ?? 20) : size;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(rating);
        if (onRate) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => onRate(star)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Text style={[styles.star, { fontSize: resolvedSize, color: filled ? '#F5A623' : '#D4C5BB' }]}>
                ★
              </Text>
            </TouchableOpacity>
          );
        }
        return (
          <Text
            key={star}
            style={[styles.star, { fontSize: resolvedSize, color: filled ? '#F5A623' : '#D4C5BB' }]}
          >
            ★
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
});
