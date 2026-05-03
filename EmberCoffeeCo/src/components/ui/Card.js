import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import colors from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';

export default function Card({ children, style, shadow = true }) {
  return (
    <View style={[styles.card, shadow ? styles.shadow : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
    borderRadius: borderRadius.card,
    padding: 16,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
