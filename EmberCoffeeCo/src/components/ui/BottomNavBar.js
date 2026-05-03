import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';

const TABS = [
  {
    key: 'Home',
    label: 'Home',
    selected:    'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208775/home_icon_selected_p0iw8j.png',
    unselected:  'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208775/home_icon_non-selected_pqsken.png',
  },
  {
    key: 'Menu',
    label: 'Menu',
    selected:    'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208776/menu_icon_selected_zthasn.png',
    unselected:  'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208775/menu_icon_non-selected_qvdfxh.png',
  },
  {
    key: 'Rewards',
    label: 'Rewards',
    selected:    'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208775/rewards_icon_selected_b0om0y.png',
    unselected:  'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208779/rewards_icon_non-selected_nepvb6.png',
  },
  {
    key: 'Orders',
    label: 'Orders',
    selected:    'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208777/orders_icon_selected_df3ndx.png',
    unselected:  'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208776/orders_icon_non-selected_dytebh.png',
  },
  {
    key: 'Profile',
    label: 'Profile',
    selected:    'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208779/profile_icon_selected_pllp3v.png',
    unselected:  'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775208778/profile_icon_non-selected_is0shg.png',
  },
];

export default function BottomNavBar({ activeTab, onTabPress }) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress && onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: isActive ? tab.selected : tab.unselected }}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={styles.activeDot} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    marginTop: 3,
  },
  labelActive: {
    color: colors.primary,
  },
  labelInactive: {
    color: '#9E9E9E',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});
