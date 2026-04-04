import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAutenticacao } from '../../src/auth/context/contexto-autenticacao';
import { listarLeiloesAdmin, listarResgatesAdmin, listarVencedoresAdmin } from '../../src/auth/services/servico-admin';

export default function AdminResumoScreen() {
  const { token, sair } = useAutenticacao();
  const [carregando, setCarregando] = useState(false);
  const [leiloes, setLeiloes] = useState([]);
  const [vencedores, setVencedores] = useState([]);
  const [resgates, setResgates] = useState([]);

  const carregar = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      const [leiloesResp, vencedoresResp, resgatesResp] = await Promise.all([
        listarLeiloesAdmin(token),
        listarVencedoresAdmin(token),
        listarResgatesAdmin(token),
      ]);
      setLeiloes(leiloesResp.auctions || []);
      setVencedores(vencedoresResp.winners || []);
      setResgates(resgatesResp.redemptions || []);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao carregar resumo do admin.');
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const metricas = useMemo(() => {
    const solicitados = resgates.filter((item) => item.status === 'requested').length;
    const emCaminho = resgates.filter((item) => item.status === 'confirmed').length;
    const entregues = resgates.filter((item) => item.status === 'delivered').length;

    return {
      leiloes: leiloes.length,
      vencedores: vencedores.length,
      solicitados,
      emCaminho,
      entregues,
    };
  }, [leiloes, vencedores, resgates]);

  async function sairPainelAdmin() {
    await sair();
    router.replace('/admin-login');
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} />}
    >
      <View style={styles.hero}>
        <Text style={styles.titulo}>Admin Leiloes</Text>
        <Text style={styles.subtitulo}>Uma tela de controle rapido para acompanhar operacao e acionar fluxos.</Text>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Leiloes</Text>
          <Text style={styles.kpiValue}>{metricas.leiloes}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Vencedores</Text>
          <Text style={styles.kpiValue}>{metricas.vencedores}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Resgates</Text>
        <View style={styles.badgesRow}>
          <View style={styles.badgeBox}>
            <Text style={styles.badgeNumero}>{metricas.solicitados}</Text>
            <Text style={styles.badgeLabel}>Solicitados</Text>
          </View>
          <View style={styles.badgeBox}>
            <Text style={styles.badgeNumero}>{metricas.emCaminho}</Text>
            <Text style={styles.badgeLabel}>A caminho</Text>
          </View>
          <View style={styles.badgeBox}>
            <Text style={styles.badgeNumero}>{metricas.entregues}</Text>
            <Text style={styles.badgeLabel}>Entregues</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Atalhos</Text>
        <View style={styles.atalhosRow}>
          <Pressable style={styles.atalho} onPress={() => router.push('/admin/leiloes')}>
            <Text style={styles.atalhoTexto}>Gerenciar leiloes</Text>
          </Pressable>
          <Pressable style={styles.atalho} onPress={() => router.push('/admin/resgates')}>
            <Text style={styles.atalhoTexto}>Fluxo de resgates</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.botaoSair} onPress={sairPainelAdmin}>
        <Text style={styles.botaoSairTexto}>Sair da conta admin</Text>
      </Pressable>
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
  hero: {
    backgroundColor: '#0b1222',
    borderRadius: 18,
    padding: 16,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitulo: {
    color: '#c7d3ee',
    marginTop: 6,
    fontSize: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ff',
    padding: 12,
  },
  kpiLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4ff',
    padding: 12,
    gap: 10,
  },
  cardTitulo: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badgeBox: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#f3f7ff',
    borderWidth: 1,
    borderColor: '#d8e2ff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  badgeNumero: {
    color: '#1d4ed8',
    fontSize: 20,
    fontWeight: '800',
  },
  badgeLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  atalhosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  atalho: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  atalhoTexto: {
    color: '#fff',
    fontWeight: '700',
  },
  botaoSair: {
    marginTop: 6,
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoSairTexto: {
    color: '#fff',
    fontWeight: '700',
  },
});
