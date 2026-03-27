import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';

export default function TelaConfiguracoes() {
  const { usuario, ativarBiometriaNaContaAtual, desativarBiometriaNoAparelho, excluirContaAtual } = useAutenticacao();

  const excluirConta = async () => {
    Alert.alert('Excluir conta', 'Essa ação remove sua conta, foto e dados de biometria. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirContaAtual();
            Alert.alert('Conta excluída', 'Sua conta foi removida com sucesso.', [
              {
                text: 'OK',
                onPress: () => {
                  router.replace('/login');
                },
              },
            ]);
          } catch (error) {
            Alert.alert('Erro', error?.message || 'Não foi possível excluir sua conta.');
          }
        },
      },
    ]);
  };

  const cadastrarBiometria = async () => {
    try {
      await ativarBiometriaNaContaAtual();
      Alert.alert('Sucesso', 'Biometria cadastrada nesta conta.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível cadastrar biometria.');
    }
  };

  const removerBiometria = async () => {
    if (!usuario?.biometricEnabled) {
      Alert.alert('Biometria', 'Esta conta não possui biometria ativa.');
      return;
    }

    try {
      await desativarBiometriaNoAparelho();
      Alert.alert('Sucesso', 'Biometria removida desta conta.');
    } catch {
      Alert.alert('Erro', 'Não foi possível remover biometria.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.conteudoScroll} style={styles.tela}>
      <View style={styles.caixaTitulo}>
        <Text style={styles.titulo}>Configurações</Text>
      </View>

      <View style={styles.caixaConteudo}>
        <TouchableOpacity style={[styles.botao, styles.botaoExcluirConta]} onPress={excluirConta}>
          <Text style={styles.mensagem}>Excluir Conta</Text>
        </TouchableOpacity>

        {!usuario?.biometricEnabled ? (
          <TouchableOpacity style={[styles.botao, styles.botaoBiometriaCadastrar]} onPress={cadastrarBiometria}>
            <Text style={styles.mensagem}>Cadastrar Biometria Nesta Conta</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={[styles.botao, styles.botaoBiometria]} onPress={removerBiometria}>
          <Text style={styles.mensagem}>Remover Biometria Desta Conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  conteudoScroll: {
    padding: 20,
    gap: 12,
  },
  caixaConteudo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 10,
  },
  caixaTitulo: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  titulo: {
    fontSize: 28,
    color: '#0f172a',
    fontWeight: '800',
  },
  botao: {
    backgroundColor: 'red',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  botaoBiometria: {
    backgroundColor: '#1d4ed8',
  },
  botaoBiometriaCadastrar: {
    backgroundColor: '#0f766e',
  },
  botaoExcluirConta: {
    backgroundColor: '#991b1b',
  },
  mensagem: {
    textAlign: 'center',
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
});
