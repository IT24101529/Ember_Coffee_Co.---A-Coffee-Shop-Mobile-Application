import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, fontSizes } from '../../theme/typography';

export default function Divider({ label, style }) {
  if (label) {
    return (
      <View style={[styles.row, style]}>
        <View style={styles.line} />
        <Text style={styles.label}>{label}</Text>
        <View style={styles.line} />
      </View>
    );
  }

  return <View style={[styles.simpleLine, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  simpleLine: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    width: '100%',
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(0,0,0,0.45)',
    marginHorizontal: 12,
  },
});
