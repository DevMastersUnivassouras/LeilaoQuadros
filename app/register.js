import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { BotaoAutenticacao } from '@/src/auth/components/botao-autenticacao';
import { EntradaAutenticacao } from '@/src/auth/components/entrada-autenticacao';
import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';

export default function TelaCadastro() {
  const { fazerCadastro } = useAutenticacao();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ativarBiometriaNoAparelho, setAtivarBiometriaNoAparelho] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function clicarCadastrar() {
    try {
      setCarregando(true);
      const resultadoCadastro = await fazerCadastro(
        {
          firstName: nome,
          lastName: sobrenome,
          email,
          password: senha,
          biometricEnabled: ativarBiometriaNoAparelho,
        },
        ativarBiometriaNoAparelho,
      );

      if (resultadoCadastro?.mensagemBiometria) {
        Alert.alert('Biometria', resultadoCadastro.mensagemBiometria);
      }

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Erro no cadastro', error.message || 'Não foi possível cadastrar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.caixaPrincipal}>
      <Text style={styles.titulo}>Criar conta</Text>

      <EntradaAutenticacao
        label="Nome"
        value={nome}
        onChangeText={setNome}
        placeholder="Seu nome"
        autoCapitalize="words"
      />

      <EntradaAutenticacao
        label="Sobrenome"
        value={sobrenome}
        onChangeText={setSobrenome}
        placeholder="Seu sobrenome"
        autoCapitalize="words"
      />

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
        placeholder="Crie uma senha"
        secureTextEntry
      />

      <View style={styles.linhaOpcao}>
        <Text style={styles.textoOpcao}>Cadastrar biometria no aparelho</Text>
        <Switch value={ativarBiometriaNoAparelho} onValueChange={setAtivarBiometriaNoAparelho} />
      </View>

      <BotaoAutenticacao title="Cadastrar" onPress={clicarCadastrar} loading={carregando} />

      <Link href="/login" style={styles.linkLogin}>
        Já tem conta? Entrar
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
  linhaOpcao: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  textoOpcao: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  linkLogin: {
    marginTop: 16,
    color: '#1d4ed8',
    textAlign: 'center',
    fontWeight: '600',
  },
});
