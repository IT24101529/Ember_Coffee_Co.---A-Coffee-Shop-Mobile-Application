import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { fonts, fontSizes } from '../../theme/typography';

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: '#FFFFFF' },
  },
  accent: {
    container: { backgroundColor: colors.accent },
    text: { color: colors.dark },
  },
  success: {
    container: { backgroundColor: '#38A169' },
    text: { color: '#FFFFFF' },
  },
};

export default function Badge({ label, variant = 'primary', style }) {
  const v = variantStyles[variant] || variantStyles.primary;

  return (
    <View style={[styles.base, v.container, style]}>
      <Text style={[styles.label, v.text]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    letterSpacing: 0.4,
  },
});
