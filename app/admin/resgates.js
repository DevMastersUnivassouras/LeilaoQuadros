import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAutenticacao } from '../../src/auth/context/contexto-autenticacao';
import { atualizarStatusResgateAdmin, listarResgatesAdmin } from '../../src/auth/services/servico-admin';

function traduzirStatusResgate(status) {
  const mapa = {
    requested: 'Solicitado',
    confirmed: 'A caminho',
    delivered: 'Entregue',
  };

  return mapa[String(status || '').toLowerCase()] || 'Pendente';
}

export default function AdminResgatesScreen() {
  const { token } = useAutenticacao();
  const [carregando, setCarregando] = useState(false);
  const [resgates, setResgates] = useState([]);

  const carregar = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      const resultado = await listarResgatesAdmin(token);
      setResgates(resultado.redemptions || []);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao carregar resgates.');
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function liberarResgate(redemptionId) {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      await atualizarStatusResgateAdmin(token, redemptionId, 'confirmed');
      await carregar();
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel atualizar status do resgate.');
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
        <Text style={styles.titulo}>Solicitacoes de resgate</Text>
        {resgates.map((item) => (
          <View key={item.id} style={styles.itemLinha}>
            <Text style={styles.itemTitulo}>{item.auctionTitle}</Text>
            <Text style={styles.itemInfo}>Usuario: {item.userFirstName} {item.userLastName}</Text>
            <Text style={styles.itemInfo}>Status: {traduzirStatusResgate(item.status)}</Text>
            <Text style={styles.itemInfo}>Pagamento: {item.paymentMethod === 'deposito_simulado' ? 'Deposito simulado' : item.paymentMethod}</Text>
            <Text style={styles.itemInfo}>Endereco: {item.addressLine}, {item.addressNumber} - {item.city}/{item.state}</Text>

            {item.status === 'requested' ? (
              <View style={styles.linhaAcoes}>
                <Pressable style={styles.acaoParticipantes} onPress={() => liberarResgate(item.id)}>
                  <Text style={styles.textoAcao}>Liberar resgate</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {!resgates.length ? <Text style={styles.vazio}>Sem solicitacoes de resgate no momento.</Text> : null}
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
  linhaAcoes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  acaoParticipantes: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  textoAcao: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  vazio: {
    color: '#6b7280',
    fontSize: 13,
  },
});
