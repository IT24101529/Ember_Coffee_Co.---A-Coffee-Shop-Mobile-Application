import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { fonts, fontSizes } from '../../theme/typography';

const variantStyles = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
    text: {
      color: '#FFFFFF',
    },
  },
  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    text: {
      color: '#FFFFFF',
    },
  },
  ghost: {
    container: {
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: '#FFFFFF',
    },
    text: {
      color: '#FFFFFF',
    },
  },
};

export default function Button({
  variant = 'primary',
  title,
  onPress,
  style,
  disabled = false,
}) {
  const v = variantStyles[variant] || variantStyles.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        v.container,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, v.text]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    width: '100%',
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.45,
  },
});
