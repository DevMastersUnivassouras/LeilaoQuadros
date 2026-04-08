import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useAutenticacao } from '../../src/auth/context/contexto-autenticacao';
import { listarLeiloesAdmin, listarParticipantesAdmin } from '../../src/auth/services/servico-admin';

function formatarMoney(value) {
  return Number(value || 0).toFixed(2);
}

export default function AdminParticipantesScreen() {
  const { token } = useAutenticacao();
  const params = useLocalSearchParams();
  const [carregando, setCarregando] = useState(false);
  const [leiloes, setLeiloes] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [leilaoSelecionado, setLeilaoSelecionado] = useState('');

  const carregarLeiloes = useCallback(async () => {
    if (!token) {
      return;
    }

    const listaLeiloes = await listarLeiloesAdmin(token);
    setLeiloes(listaLeiloes.auctions || []);
    return listaLeiloes.auctions || [];
  }, [token]);

  const carregarParticipantes = useCallback(
    async (auctionId) => {
      if (!token || !auctionId) {
        setParticipantes([]);
        return;
      }

      const resultado = await listarParticipantesAdmin(token, auctionId);
      setParticipantes(resultado.participants || []);
    },
    [token],
  );

  const carregar = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      const lista = await carregarLeiloes();
      const auctionIdParam = String(params.auctionId || '').trim();
      const alvo = auctionIdParam || leilaoSelecionado || (lista?.[0]?.id ? String(lista[0].id) : '');

      if (alvo) {
        setLeilaoSelecionado(alvo);
        await carregarParticipantes(alvo);
      } else {
        setParticipantes([]);
      }
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao carregar participantes.');
    } finally {
      setCarregando(false);
    }
  }, [token, carregarLeiloes, params.auctionId, leilaoSelecionado, carregarParticipantes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const nomeLeilaoSelecionado = useMemo(() => {
    const encontrado = leiloes.find((item) => String(item.id) === String(leilaoSelecionado));
    return encontrado?.title || '';
  }, [leiloes, leilaoSelecionado]);

  async function selecionarLeilao(auctionId) {
    try {
      setCarregando(true);
      setLeilaoSelecionado(auctionId);
      await carregarParticipantes(auctionId);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel listar participantes.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} />}
    >
      <View style={styles.card}>
        <Text style={styles.titulo}>Participantes por leilao</Text>
        <View style={styles.chipsLinha}>
          {leiloes.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.chip, String(leilaoSelecionado) === String(item.id) ? styles.chipAtivo : null]}
              onPress={() => selecionarLeilao(String(item.id))}
            >
              <Text style={[styles.chipTexto, String(leilaoSelecionado) === String(item.id) ? styles.chipTextoAtivo : null]}>
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.tituloLista}>{nomeLeilaoSelecionado ? `Leilao: ${nomeLeilaoSelecionado}` : 'Selecione um leilao'}</Text>
        {participantes.map((item, index) => (
          <View key={item.id} style={styles.itemLinha}>
            <Text style={styles.itemTitulo}>#{index + 1} {item.firstName} {item.lastName}</Text>
            <Text style={styles.itemInfo}>CPF: {item.cpf}</Text>
            <Text style={styles.itemInfo}>Email: {item.email}</Text>
            <Text style={styles.itemInfo}>Telefone: {item.phone}</Text>
            <Text style={styles.itemInfo}>Qtd. lances: {item.bidsCount} | Max bid: R$ {formatarMoney(item.maxBid)}</Text>
          </View>
        ))}
        {!participantes.length ? <Text style={styles.vazio}>Sem participantes para o leilao selecionado.</Text> : null}
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
  chipsLinha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#eef3ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipAtivo: {
    backgroundColor: '#1d4ed8',
  },
  chipTexto: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextoAtivo: {
    color: '#fff',
  },
  tituloLista: {
    color: '#0f172a',
    fontSize: 16,
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
