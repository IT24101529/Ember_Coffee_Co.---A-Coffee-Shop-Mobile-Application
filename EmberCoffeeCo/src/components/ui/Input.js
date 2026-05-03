import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import colors from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { fonts, fontSizes } from '../../theme/typography';

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  error,
  secureTextEntry = false,
  rightElement,
  ...rest
}) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : null]}
          placeholder={placeholder}
          placeholderTextColor="rgba(0,0,0,0.35)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          {...rest}
        />
        {rightElement ? <View style={styles.rightSlot}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.dark,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.input,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 14,
  },
  inputRowError: {
    borderColor: '#E53E3E',
  },
  iconSlot: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base,
    color: colors.dark,
    height: '100%',
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  rightSlot: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: '#E53E3E',
  },
});
