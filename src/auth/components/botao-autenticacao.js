import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

export function BotaoAutenticacao({ title, onPress, loading = false, variant = 'primary' }) {
  return (
    <Pressable
      style={[styles.botao, variant === 'secondary' ? styles.secundario : styles.primario]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#1d4ed8' : '#fff'} />
      ) : (
        <Text style={[styles.texto, variant === 'secondary' ? styles.textoSecundario : styles.textoPrimario]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  primario: {
    backgroundColor: '#1d4ed8',
  },
  secundario: {
    backgroundColor: '#dbeafe',
  },
  texto: {
    fontSize: 16,
    fontWeight: '700',
  },
  textoPrimario: {
    color: '#fff',
  },
  textoSecundario: {
    color: '#1d4ed8',
  },
});
