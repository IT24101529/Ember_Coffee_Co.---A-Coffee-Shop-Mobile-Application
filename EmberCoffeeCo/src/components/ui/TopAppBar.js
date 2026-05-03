import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

export const BRAND_LOGO_URI = 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775206010/black_logo_nualaj.png';

export default function TopAppBar({ title, onBack, rightElement, style }) {
  const isBrandTitle = !title || title === 'EMBER COFFEE CO.';

  return (
    <View style={[styles.bar, style]}>
      {/* Left: back button or spacer */}
      <View style={styles.side}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backIcon}>{'‹'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center: logo or title */}
      {isBrandTitle ? (
        <Image source={{ uri: BRAND_LOGO_URI }} style={styles.logo} resizeMode="contain" />
      ) : (
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      )}

      {/* Right: optional element or spacer */}
      <View style={[styles.side, styles.sideRight]}>
        {rightElement || null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  side: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  backBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: colors.dark,
    lineHeight: 32,
    fontFamily: fonts.light,
  },
  logo: {
    flex: 1,
    height: 32,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: fontSizes.base,
    color: colors.dark,
    letterSpacing: 0.5,
  },
});
