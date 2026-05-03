import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config/api';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import spacing, { borderRadius } from '../../theme/spacing';

// ─── Admin BottomNavBar (admin variant) ──────────────────────────────────────
const ADMIN_TABS = [
  {
    key: 'Dashboard',
    label: 'Dashboard',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210244/dashboard_icon_selected_twkuel.png',
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210249/dashboard_icon_non-selected_f59pd7.png',
  },
  {
    key: 'Users',
    label: 'Users',
    selected:   'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210245/profile_icon_selected_twkuel.png', // Placeholder
    unselected: 'https://res.cloudinary.com/dqjzgnghk/image/upload/v1775210249/profile_icon_non-selected_f59pd7.png', // Placeholder
  },
];

function AdminBottomNavBar({ activeTab, onTabPress }) {
  return (
    <View style={navStyles.bar}>
      {ADMIN_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={navStyles.tab}
            onPress={() => onTabPress && onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: isActive ? tab.selected : tab.unselected }}
              style={navStyles.icon}
              resizeMode="contain"
            />
            <Text style={[navStyles.label, isActive ? navStyles.labelActive : navStyles.labelInactive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={navStyles.activeDot} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const navStyles = StyleSheet.create({
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
  icon: { width: 24, height: 24 },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    marginTop: 3,
  },
  labelActive: { color: colors.primary },
  labelInactive: { color: '#9E9E9E' },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});

export default function AdminDashboardScreen({ navigation }) {
  const { user, token } = useAuth();
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.notAuthText}>Admin access required.</Text>
      </SafeAreaView>
    );
  }

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsersCount(data.length);
    } catch (err) {
      console.log('Error fetching user stats');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  const handleAdminTabPress = (tab) => {
    if (tab === 'Users') navigation.navigate('AdminUsers');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.dashHeading}>Admin Dashboard</Text>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{loading ? '...' : usersCount}</Text>
          <Text style={styles.statTitle}>Total Registered Users</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('AdminUsers')} 
            style={styles.statLink}
          >
            <Text style={styles.statLinkText}>Manage Users</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <AdminBottomNavBar activeTab="Dashboard" onTabPress={handleAdminTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  notAuthText: { fontFamily: fonts.semiBold, fontSize: fontSizes.base, color: colors.dark },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  dashHeading: { fontFamily: fonts.extraBold, fontSize: fontSizes['3xl'], color: colors.dark, marginBottom: spacing.lg },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    shadowColor: colors.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.extraBold, fontSize: fontSizes['5xl'], color: colors.primary },
  statTitle: { fontFamily: fonts.semiBold, fontSize: fontSizes.md, color: colors.dark, marginTop: 4 },
  statLink: { marginTop: spacing.md },
  statLinkText: { fontFamily: fonts.semiBold, fontSize: fontSizes.sm, color: colors.primary, textDecorationLine: 'underline' },
});
