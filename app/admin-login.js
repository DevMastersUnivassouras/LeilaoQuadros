import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BotaoAutenticacao } from '../src/auth/components/botao-autenticacao';
import { EntradaAutenticacao } from '../src/auth/components/entrada-autenticacao';
import { useAutenticacao } from '../src/auth/context/contexto-autenticacao';

export default function TelaLoginAdmin() {
  const { fazerLoginAdmin, usuario, ehAdmin } = useAutenticacao();
  const [adminId, setAdminId] = useState('admin');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (usuario && ehAdmin) {
      router.replace('/admin/painel');
    }
  }, [usuario, ehAdmin]);

  async function entrarAdmin() {
    try {
      setCarregando(true);
      await fazerLoginAdmin({ adminId, password: senha });
      router.replace('/admin/painel');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível entrar como administrador.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.caixaPrincipal}>
      <Text style={styles.titulo}>Login Administrador</Text>

      <EntradaAutenticacao
        label="ID Admin"
        value={adminId}
        onChangeText={setAdminId}
        placeholder="admin"
        autoCapitalize="none"
      />

      <EntradaAutenticacao
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        placeholder="Senha do admin"
        secureTextEntry
      />

      <BotaoAutenticacao title="Entrar no Painel" onPress={entrarAdmin} loading={carregando} />
      <BotaoAutenticacao title="Voltar ao login" onPress={() => router.replace('/login')} variant="secondary" />
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
});
