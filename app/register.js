import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { BotaoAutenticacao } from '@/src/auth/components/botao-autenticacao';
import { EntradaAutenticacao } from '@/src/auth/components/entrada-autenticacao';
import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';

function validarEmail(valor) {
  const emailLimpo = String(valor || '').trim().toLowerCase();
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regexEmail.test(emailLimpo);
}

function validarCadastro({ nome, sobrenome, cpf, email, telefone, senha, senhaConfirmacao }) {
  if (!nome.trim() || nome.trim().length < 2) return "Informe um nome válido.";
  if (!sobrenome.trim() || sobrenome.trim().length < 2) return "Informe um sobrenome válido.";
  if (String(cpf || "").replace(/\D/g, "").length !== 11) return "CPF deve ter 11 dígitos.";
  if (!validarEmail(email)) return "Informe um email válido.";
  if (!telefone.trim() || telefone.trim().length < 8) return "Informe um telefone válido.";
  if (!senha || senha.length < 6) return "Senha deve ter pelo menos 6 caracteres.";
  if (senha !== senhaConfirmacao) return "As senhas não coincidem.";
  return null;
}

export default function TelaCadastro() {
  const { fazerCadastro } = useAutenticacao();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [ativarBiometriaNoAparelho, setAtivarBiometriaNoAparelho] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function clicarCadastrar() {
    const erroValidacao = validarCadastro({
      nome,
      sobrenome,
      cpf,
      email,
      telefone,
      senha,
      senhaConfirmacao,
    });

    if (erroValidacao) {
      Alert.alert("Erro", erroValidacao);
      return;
    }

    const payload = {
      firstName: nome.trim(),
      lastName: sobrenome.trim(),
      cpf: cpf,
      email: email.trim().toLowerCase(),
      phone: telefone.trim(),
      password: senha,
      passwordConfirmation: senhaConfirmacao,
      biometricEnabled: ativarBiometriaNoAparelho,
    };

    try {
      setCarregando(true);
      
      const resultadoCadastro = await fazerCadastro(payload, ativarBiometriaNoAparelho);

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
    <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
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
          label="CPF"
          value={cpf}
          onChangeText={setCpf}
          placeholder="Somente numeros"
          keyboardType="number-pad"
        />

        <EntradaAutenticacao
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="seuemail@dominio.com"
          keyboardType="email-address"
        />

        <EntradaAutenticacao
          label="Telefone"
          value={telefone}
          onChangeText={setTelefone}
          placeholder="Seu telefone"
          keyboardType="phone-pad"
        />

        <EntradaAutenticacao
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          placeholder="Crie uma senha"
          secureTextEntry
        />

        <EntradaAutenticacao
          label="Confirmação de Senha"
          value={senhaConfirmacao}
          onChangeText={setSenhaConfirmacao}
          placeholder="Repita a sua senha"
          secureTextEntry
        />

        <View style={styles.linhaOpcao}>
          <Text style={styles.textoOpcao}>Cadastrar biometria no aparelho</Text>
          <Switch value={ativarBiometriaNoAparelho} onValueChange={setAtivarBiometriaNoAparelho} />
        </View>

        <BotaoAutenticacao title="Cadastrar" onPress={() => {
          clicarCadastrar();
          Keyboard.dismiss();
        }}
          loading={carregando} />

        <Link href="/login" style={styles.linkLogin} onPress={() => Keyboard.dismiss()}>
          Já tem conta? Entrar
        </Link>
      </View>
    </KeyboardAwareScrollView>
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
