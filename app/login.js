import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BotaoAutenticacao } from '@/src/auth/components/botao-autenticacao';
import { EntradaAutenticacao } from '@/src/auth/components/entrada-autenticacao';
import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';

export default function TelaLogin() {
  const { fazerLogin, entrarComBiometria, podeMostrarBiometria, usuario } = useAutenticacao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (usuario) {
      router.replace('/(tabs)');
    }
  }, [usuario]);

  async function clicarEntrar() {
    try {
      setCarregando(true);
      const resultadoLogin = await fazerLogin({ email, password: senha }, false);

      if (resultadoLogin?.mensagemBiometria) {
        Alert.alert('Biometria', resultadoLogin.mensagemBiometria);
      }

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Erro no login', error.message || 'Não foi possível entrar.');
    } finally {
      setCarregando(false);
    }
  }

  async function clicarBiometria() {
    try {
      setCarregando(true);
      await entrarComBiometria();
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Erro na biometria', error.message || 'Não foi possível autenticar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.caixaPrincipal}>
      <Text style={styles.titulo}>Entrar no Leilão</Text>

      <EntradaAutenticacao
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="seuemail@dominio.com"
        keyboardType="email-address"
      />

      <EntradaAutenticacao
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        placeholder="Sua senha"
        secureTextEntry
      />

      <BotaoAutenticacao title="Entrar" onPress={clicarEntrar} loading={carregando} />

      {podeMostrarBiometria ? (
        <BotaoAutenticacao
          title="Entrar com biometria"
          onPress={clicarBiometria}
          loading={carregando}
          variant="secondary"
        />
      ) : null}

      <Link href="/register" style={styles.linkCadastro}>
        Não tem conta? Cadastre-se
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  caixaPrincipal: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    color: '#0f172a',
  },
  linkCadastro: {
    marginTop: 16,
    color: '#1d4ed8',
    textAlign: 'center',
    fontWeight: '600',
  },
});
