import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAutenticacao } from '../../src/auth/context/contexto-autenticacao';

export default function TelaInicio() {
  const { usuario, sair } = useAutenticacao();

  async function aoClicarSair() {
    try {
      await sair();
      router.replace('/login');
    } catch {
      Alert.alert('Erro', 'Nao foi possivel sair da conta.');
    }
  }

  return (
    <View style={styles.tela}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>LeilaoQuadros</Text>
        <Text style={styles.titulo}>Bem-vindo, {usuario?.firstName || 'usuario'}.</Text>
        <Text style={styles.subtitulo}>
          Explore leiloes em geral, acompanhe oportunidades em tempo real e participe quando fizer sentido para voce.
        </Text>
      </View>

      <View style={styles.acoes}>
        <Pressable style={styles.botaoPrimario} onPress={() => router.push('/(tabs)/leiloes')}>
          <Text style={styles.textoBotaoPrimario}>Ver leiloes</Text>
        </Pressable>

        <Pressable style={styles.botaoSecundario} onPress={aoClicarSair}>
          <Text style={styles.textoBotaoSecundario}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    justifyContent: 'space-between',
  },
  hero: {
    marginTop: 56,
    gap: 10,
  },
  eyebrow: {
    color: '#0ea5e9',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titulo: {
    color: '#0f172a',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitulo: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 380,
  },
  acoes: {
    gap: 10,
    paddingBottom: 20,
  },
  botaoPrimario: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoBotaoPrimario: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  botaoSecundario: {
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoBotaoSecundario: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
});
