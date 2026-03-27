import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export function EntradaAutenticacao({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
}) {
  return (
    <View style={styles.caixaCampo}>
      <Text style={styles.rotulo}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={styles.entrada}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  caixaCampo: {
    width: '100%',
    marginBottom: 14,
  },
  rotulo: {
    marginBottom: 6,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  entrada: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    color: '#111827',
  },
});
