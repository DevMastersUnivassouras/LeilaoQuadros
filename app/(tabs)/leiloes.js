import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAutenticacao } from '../../src/auth/context/contexto-autenticacao';
import { API_BASE_URL } from '../../src/auth/services/servico-api';
import { buscarCarteira, buscarDetalheLeilao, enviarLance, listarLeiloes } from '../../src/auth/services/servico-leilao';

const filtrosStatus = ['active', 'scheduled', 'closed', 'cancelled'];
const statusLabel = {
  active: 'Ao vivo',
  scheduled: 'Agendados',
  closed: 'Encerrados',
  cancelled: 'Cancelados',
};

function traduzirStatus(status) {
  return statusLabel[String(status || '').toLowerCase()] || 'Indefinido';
}

function montarUrlImagem(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toFixed(2);
}

function formatarData(valor) {
  if (!valor) {
    return '-';
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return '-';
  }

  return data.toLocaleString('pt-BR');
}

export default function TelaLeiloes() {
  const { token } = useAutenticacao();
  const [statusAtivo, setStatusAtivo] = useState('active');
  const [leiloes, setLeiloes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [detalheLeilao, setDetalheLeilao] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [enviandoLance, setEnviandoLance] = useState(false);
  const [valorLance, setValorLance] = useState('');
  const [carteira, setCarteira] = useState({ walletBalance: 0, walletReserved: 0, walletAvailable: 0 });

  const carregarCarteira = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const walletRes = await buscarCarteira(token);
      setCarteira(walletRes.wallet || { walletBalance: 0, walletReserved: 0, walletAvailable: 0 });
    } catch {
      setCarteira({ walletBalance: 0, walletReserved: 0, walletAvailable: 0 });
    }
  }, [token]);

  const carregarLeiloes = useCallback(async (status) => {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      const resposta = await listarLeiloes(token, status);
      setLeiloes(resposta.auctions || []);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel carregar os leiloes.');
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarLeiloes(statusAtivo);
  }, [carregarLeiloes, statusAtivo]);

  useFocusEffect(
    useCallback(() => {
      carregarCarteira();
    }, [carregarCarteira]),
  );

  async function abrirStory(auctionId) {
    if (!token) {
      return;
    }

    try {
      setCarregandoDetalhe(true);
      const resposta = await buscarDetalheLeilao(token, auctionId);
      setDetalheLeilao(resposta);

      const minimo = Math.max(
        Number(resposta?.auction?.currentBid || 0) + Number(resposta?.auction?.minIncrement || 0),
        Number(resposta?.auction?.startingBid || 0),
      );
      setValorLance(String(minimo.toFixed(2)));
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel abrir o detalhe do leilao.');
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  const lanceMinimo = useMemo(() => {
    if (!detalheLeilao?.auction) {
      return 0;
    }

    const atual = Number(detalheLeilao.auction.currentBid || 0);
    const incremento = Number(detalheLeilao.auction.minIncrement || 0);
    const inicial = Number(detalheLeilao.auction.startingBid || 0);
    return Math.max(atual + incremento, inicial);
  }, [detalheLeilao]);

  const podeLancar = useMemo(() => {
    if (!detalheLeilao?.auction) {
      return false;
    }

    const leilao = detalheLeilao.auction;
    const agora = Date.now();
    const inicio = new Date(leilao.startsAt).getTime();
    const fim = new Date(leilao.endsAt).getTime();
    return leilao.status === 'active' && agora >= inicio && agora < fim;
  }, [detalheLeilao]);

  async function confirmarLance() {
    if (!token || !detalheLeilao?.auction) {
      return;
    }

    const amount = Number(valorLance);

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Lance invalido', 'Informe um valor valido.');
      return;
    }

    if (amount < lanceMinimo) {
      Alert.alert('Lance invalido', `O valor minimo para esse leilao e R$ ${lanceMinimo.toFixed(2)}.`);
      return;
    }

    try {
      setEnviandoLance(true);
      const resposta = await enviarLance(token, detalheLeilao.auction.id, amount);
      const auctionAtualizado = resposta.auction;

      setLeiloes((anterior) => anterior.map((item) => (item.id === auctionAtualizado.id ? { ...item, ...auctionAtualizado } : item)));
      await carregarCarteira();
      await abrirStory(auctionAtualizado.id);
      Alert.alert('Sucesso', 'Lance enviado com sucesso.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel enviar o lance.');
    } finally {
      setEnviandoLance(false);
    }
  }

  function renderLeilao({ item }) {
    const imagem = montarUrlImagem(item.mediaUrl);

    return (
      <Pressable style={styles.card} onPress={() => abrirStory(item.id)}>
        {imagem ? <Image source={{ uri: imagem }} style={styles.cardImagem} /> : <View style={[styles.cardImagem, styles.semImagem]} />}

        <View style={styles.cardTexto}>
          <Text style={styles.cardTitulo}>{item.title}</Text>
          <Text style={styles.cardMeta}>Status: {traduzirStatus(item.status)}</Text>
          <Text style={styles.cardMeta}>Atual: R$ {formatarMoeda(item.currentBid)}</Text>
          <Text style={styles.cardMeta}>Participantes: {item.participantsCount}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.tela}>
      <Text style={styles.titulo}>Leiloes</Text>

      <View style={styles.saldoTopo}>
        <Text style={styles.saldoTopoLabel}>Saldo disponivel para lance</Text>
        <Text style={styles.saldoTopoValor}>R$ {Number(carteira.walletAvailable || 0).toFixed(2)}</Text>
      </View>

      <View style={styles.filtros}>
        {filtrosStatus.map((status) => (
          <Pressable
            key={status}
            style={[styles.filtro, statusAtivo === status ? styles.filtroAtivo : null]}
            onPress={() => setStatusAtivo(status)}
          >
            <Text style={[styles.filtroTexto, statusAtivo === status ? styles.filtroTextoAtivo : null]}>{traduzirStatus(status)}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={leiloes}
        keyExtractor={(item) => item.id}
        renderItem={renderLeilao}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => carregarLeiloes(statusAtivo)} />}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={<Text style={styles.vazio}>Nao ha leiloes nesta categoria.</Text>}
      />

      <Modal
        visible={Boolean(detalheLeilao)}
        animationType="slide"
        transparent
        onRequestClose={() => setDetalheLeilao(null)}
      >
        <View style={styles.storyOverlay}>
          <View style={styles.storyCard}>
            {carregandoDetalhe ? (
              <Text style={styles.storyTitulo}>Carregando...</Text>
            ) : (
              <>
                {detalheLeilao?.auction?.mediaUrl ? (
                  <ImageBackground source={{ uri: montarUrlImagem(detalheLeilao.auction.mediaUrl) }} style={styles.storyImagem}>
                    <View style={styles.storyEscuro} />
                    <Text style={styles.storyTitulo}>{detalheLeilao?.auction?.title}</Text>
                  </ImageBackground>
                ) : (
                  <View style={[styles.storyImagem, styles.semImagem]}>
                    <Text style={styles.storyTitulo}>{detalheLeilao?.auction?.title}</Text>
                  </View>
                )}

                <Text style={styles.storyInfo}>Status: {traduzirStatus(detalheLeilao?.auction?.status)}</Text>
                <Text style={styles.storyInfo}>Atual: R$ {formatarMoeda(detalheLeilao?.auction?.currentBid)}</Text>
                <Text style={styles.storyInfo}>Minimo: R$ {formatarMoeda(lanceMinimo)}</Text>
                <Text style={styles.storyInfo}>Inicio: {formatarData(detalheLeilao?.auction?.startsAt)}</Text>
                <Text style={styles.storyInfo}>Fim: {formatarData(detalheLeilao?.auction?.endsAt)}</Text>

                <TextInput
                  style={styles.inputLance}
                  value={valorLance}
                  onChangeText={setValorLance}
                  keyboardType="decimal-pad"
                  placeholder="Digite seu valor de lance"
                  placeholderTextColor="#94a3b8"
                />

                <View style={styles.linhaBotoes}>
                  <Pressable
                    style={[styles.botaoLance, !podeLancar ? styles.botaoDesabilitado : null]}
                    disabled={!podeLancar || enviandoLance}
                    onPress={confirmarLance}
                  >
                    <Text style={styles.textoBotao}>{enviandoLance ? 'Enviando...' : 'Participar com esse valor'}</Text>
                  </Pressable>

                  <Pressable style={styles.botaoFechar} onPress={() => setDetalheLeilao(null)}>
                    <Text style={styles.textoBotao}>Fechar</Text>
                  </Pressable>
                </View>

                {!podeLancar ? <Text style={styles.aviso}>Esse leilao nao esta apto para receber lances agora.</Text> : null}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filtros: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  saldoTopo: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ecfeff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5f3fc',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  saldoTopoLabel: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  saldoTopoValor: {
    color: '#134e4a',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  filtro: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filtroAtivo: {
    backgroundColor: '#0f172a',
  },
  filtroTexto: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
  },
  filtroTextoAtivo: {
    color: '#fff',
  },
  lista: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardImagem: {
    width: '100%',
    height: 160,
    backgroundColor: '#cbd5e1',
  },
  semImagem: {
    backgroundColor: '#cbd5e1',
  },
  cardTexto: {
    padding: 12,
    gap: 4,
  },
  cardTitulo: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  cardMeta: {
    color: '#334155',
    fontSize: 13,
  },
  vazio: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 24,
  },
  storyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.84)',
    justifyContent: 'center',
    padding: 14,
  },
  storyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    gap: 8,
  },
  storyImagem: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#334155',
  },
  storyEscuro: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.45)',
  },
  storyTitulo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    zIndex: 1,
  },
  storyInfo: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  inputLance: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#f8fafc',
    backgroundColor: '#111827',
  },
  linhaBotoes: {
    flexDirection: 'row',
    gap: 8,
  },
  botaoLance: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoFechar: {
    backgroundColor: '#475569',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  textoBotao: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  aviso: {
    color: '#fbbf24',
    fontSize: 12,
    marginTop: 2,
  },
});
