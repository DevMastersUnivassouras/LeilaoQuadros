import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAutenticacao } from '../../src/auth/context/contexto-autenticacao';
import { listarVencedoresAdmin } from '../../src/auth/services/servico-admin';

function formatarDataHora(value) {
  if (!value) {
    return '-';
  }

  const data = new Date(value);
  if (Number.isNaN(data.getTime())) {
    return '-';
  }

  return data.toLocaleString('pt-BR');
}

function formatarMoney(value) {
  return Number(value || 0).toFixed(2);
}

export default function AdminVencedoresScreen() {
  const { token } = useAutenticacao();
  const [carregando, setCarregando] = useState(false);
  const [vencedores, setVencedores] = useState([]);

  const carregar = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      const resultado = await listarVencedoresAdmin(token);
      setVencedores(resultado.winners || []);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao carregar vencedores.');
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} />}
    >
      <View style={styles.card}>
        <Text style={styles.titulo}>Vencedores</Text>
        {vencedores.map((item) => {
          const vencedor = item.winnerFirstName ? `${item.winnerFirstName} ${item.winnerLastName}` : 'Sem vencedor';

          return (
            <View key={item.id} style={styles.itemLinha}>
              <Text style={styles.itemTitulo}>{item.title}</Text>
              <Text style={styles.itemInfo}>Vencedor: {vencedor}</Text>
              <Text style={styles.itemInfo}>Lance final: R$ {formatarMoney(item.winnerBid || 0)}</Text>
              <Text style={styles.itemInfo}>Encerrado: {formatarDataHora(item.endsAt)}</Text>
            </View>
          );
        })}
        {!vencedores.length ? <Text style={styles.vazio}>Nenhum leilao encerrado ainda.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#eef3ff',
  },
  conteudo: {
    padding: 14,
    gap: 12,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4ff',
    padding: 12,
    gap: 10,
  },
  titulo: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  itemLinha: {
    borderWidth: 1,
    borderColor: '#d8e3ff',
    borderRadius: 12,
    padding: 10,
    gap: 5,
    backgroundColor: '#fbfdff',
  },
  itemTitulo: {
    color: '#0f172a',
    fontWeight: '700',
  },
  itemInfo: {
    color: '#334155',
    fontSize: 13,
  },
  vazio: {
    color: '#6b7280',
    fontSize: 13,
  },
});
