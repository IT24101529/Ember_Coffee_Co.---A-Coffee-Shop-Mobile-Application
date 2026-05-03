import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../theme/colors';
import { fonts, fontSizes } from '../../theme/typography';
import spacing, { borderRadius } from '../../theme/spacing';

export default function AccessRestrictedScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.message}>
          You don't have permission to view this section.{'\n'}
          Please contact an Admin for access.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('AdminOrders')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Go to Orders</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  icon: { fontSize: 56, marginBottom: spacing.lg },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes['2xl'],
    color: colors.dark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: 'rgba(46,21,0,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  btnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.base,
    color: '#fff',
  },
});
