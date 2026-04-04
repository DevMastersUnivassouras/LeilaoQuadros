import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { API_BASE_URL } from '../../src/auth/services/servico-api';
import {
  buscarCarteira,
  confirmarRecebimentoItem,
  listarLeiloesVencidos,
  resgatarItemLeilao,
} from '../../src/auth/services/servico-leilao';
import { useAutenticacao } from '../../src/auth/context/contexto-autenticacao';

function montarUrlImagem(url) {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function traduzirStatusResgate(status) {
  const mapa = {
    requested: 'solicitado',
    confirmed: 'a caminho',
    delivered: 'entregue',
  };

  return mapa[String(status || '').toLowerCase()] || 'pendente';
}

export default function TelaConquistas() {
  const { token } = useAutenticacao();
  const [carregando, setCarregando] = useState(false);
  const [carteira, setCarteira] = useState({ walletBalance: 0, walletReserved: 0, walletAvailable: 0 });
  const [wins, setWins] = useState([]);
  const [resgateModal, setResgateModal] = useState(null);
  const [endereco, setEndereco] = useState({
    paymentMethod: 'deposito_simulado',
    addressQuery: '',
    addressLine: '',
    addressNumber: '',
    district: '',
    city: '',
    state: '',
    zipCode: '',
    complement: '',
  });
  const [mapCoords, setMapCoords] = useState(null);
  const [sugestoesEndereco, setSugestoesEndereco] = useState([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [localizandoAtual, setLocalizandoAtual] = useState(false);
  const [carregandoMapa, setCarregandoMapa] = useState(false);

  const carregar = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      const [walletRes, winsRes] = await Promise.all([buscarCarteira(token), listarLeiloesVencidos(token)]);
      setCarteira(walletRes.wallet || { walletBalance: 0, walletReserved: 0, walletAvailable: 0 });
      setWins(winsRes.wins || []);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel carregar conquistas.');
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  useEffect(() => {
    const consulta = String(endereco.addressQuery || '').trim();

    if (!resgateModal || consulta.length < 4) {
      setSugestoesEndereco([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCarregandoSugestoes(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(consulta)}`,
        );

        const data = await response.json();
        const lista = Array.isArray(data)
          ? data
              .filter((item) => item?.lat && item?.lon)
              .map((item) => ({
                id: String(item.place_id || Math.random()),
                label: String(item.display_name || consulta),
                lat: Number(item.lat),
                lon: Number(item.lon),
                address: item.address || {},
              }))
              .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))
          : [];

        setSugestoesEndereco(lista);
      } catch {
        setSugestoesEndereco([]);
      } finally {
        setCarregandoSugestoes(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [endereco.addressQuery, resgateModal]);

  const totalVitorias = useMemo(() => wins.length, [wins]);

  function abrirResgate(item) {
    setResgateModal(item);
    setMapCoords(null);
    setEndereco({
      paymentMethod: 'deposito_simulado',
      addressQuery: '',
      addressLine: '',
      addressNumber: '',
      district: '',
      city: '',
      state: '',
      zipCode: '',
      complement: '',
    });
    setSugestoesEndereco([]);
  }

  function selecionarSugestao(sugestao) {
    const addr = sugestao.address || {};

    setMapCoords({ latitude: sugestao.lat, longitude: sugestao.lon });
    setEndereco((anterior) => ({
      ...anterior,
      addressQuery: sugestao.label,
      addressLine: String(addr.road || addr.pedestrian || sugestao.label),
      addressNumber: String(addr.house_number || 'S/N'),
      district: String(addr.suburb || addr.neighbourhood || ''),
      city: String(addr.city || addr.town || addr.village || 'Nao informado'),
      state: String(addr.state || 'NI'),
      zipCode: String(addr.postcode || '00000000').replace(/\D/g, ''),
    }));
    setSugestoesEndereco([]);
  }

  async function geocodificarEnderecoComFallback(consulta) {
    try {
      const geocode = await Location.geocodeAsync(consulta);
      const primeiro = geocode?.[0];

      if (primeiro?.latitude && primeiro?.longitude) {
        return {
          latitude: Number(primeiro.latitude),
          longitude: Number(primeiro.longitude),
          address: {},
        };
      }
    } catch {
      // ignora e segue fallback HTTP
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(consulta)}&limit=1`,
    );
    const data = await response.json();
    const primeiro = data?.[0];

    if (!primeiro?.lat || !primeiro?.lon) {
      return null;
    }

    return {
      latitude: Number(primeiro.lat),
      longitude: Number(primeiro.lon),
      address: primeiro?.address || {},
    };
  }

  function pedirPermissaoLocalizacaoComMensagem() {
    return new Promise((resolve) => {
      Alert.alert(
        'Localização para facilitar o endereço',
        'Vamos usar sua localização apenas para preencher o endereço de resgate e mostrar no mapa.',
        [
          { text: 'Agora não', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Permitir', onPress: () => resolve(true) },
        ],
      );
    });
  }

  async function visualizarMapa() {
    const consulta = String(endereco.addressQuery || '').trim();

    if (consulta.length < 6) {
      Alert.alert('Mapa', 'Digite um endereco completo para localizar no mapa.');
      return;
    }

    try {
      setCarregandoMapa(true);

      if (sugestoesEndereco.length > 0) {
        const primeiraSugestao = sugestoesEndereco[0];
        selecionarSugestao(primeiraSugestao);
        return;
      }

      const geocoded = await geocodificarEnderecoComFallback(consulta);

      if (!geocoded?.latitude || !geocoded?.longitude) {
        Alert.alert('Mapa', 'Nao encontramos esse endereco no mapa.');
        return;
      }

      const latitude = Number(geocoded.latitude);
      const longitude = Number(geocoded.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        Alert.alert('Mapa', 'Coordenadas invalidas para esse endereco.');
        return;
      }

      const enderecoApi = geocoded?.address || {};

      setMapCoords({ latitude, longitude });
      setEndereco((anterior) => ({
        ...anterior,
        addressLine: String(enderecoApi.road || consulta),
        addressNumber: String(enderecoApi.house_number || 'S/N'),
        district: String(enderecoApi.suburb || enderecoApi.neighbourhood || ''),
        city: String(enderecoApi.city || enderecoApi.town || enderecoApi.village || 'Nao informado'),
        state: String(enderecoApi.state || 'NI'),
        zipCode: String(enderecoApi.postcode || '00000000').replace(/\D/g, ''),
      }));
    } catch {
      Alert.alert('Mapa', 'Falha ao carregar mapa para esse endereço. Tente escolher uma sugestão ou usar sua localização atual.');
    } finally {
      setCarregandoMapa(false);
    }
  }

  async function abrirRotaExterna() {
    if (!mapCoords) {
      Alert.alert('Mapa', 'Primeiro visualize o endereco no mapa.');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${mapCoords.latitude},${mapCoords.longitude}`;

    try {
      const podeAbrir = await Linking.canOpenURL(url);
      if (!podeAbrir) {
        Alert.alert('Mapa', 'Nao foi possivel abrir o app de mapas.');
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert('Mapa', 'Falha ao abrir rota no app de mapas.');
    }
  }

  async function usarLocalizacaoAtual() {
    if (localizandoAtual) {
      return;
    }

    try {
      setLocalizandoAtual(true);

      const confirmou = await pedirPermissaoLocalizacaoComMensagem();
      if (!confirmou) {
        return;
      }

      const permissao = await Location.requestForegroundPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert('Localizacao', 'Permita acesso a localizacao para usar esse recurso.');
        return;
      }

      const servicosLigados = await Location.hasServicesEnabledAsync();
      if (!servicosLigados) {
        Alert.alert('Localizacao', 'Ative o GPS/localização do aparelho para usar esse recurso.');
        return;
      }

      const posicao =
        (await Location.getLastKnownPositionAsync()) ||
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));

      if (!posicao?.coords) {
        Alert.alert('Localizacao', 'Nao foi possivel obter sua localizacao atual.');
        return;
      }

      const latitude = Number(posicao.coords.latitude);
      const longitude = Number(posicao.coords.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        Alert.alert('Localizacao', 'Nao foi possivel obter sua localizacao atual.');
        return;
      }

      setMapCoords({ latitude, longitude });

      let addr = {};
      let label = `${latitude}, ${longitude}`;

      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        const primeiro = reverse?.[0] || {};
        addr = {
          road: primeiro.street,
          house_number: primeiro.streetNumber,
          suburb: primeiro.subregion,
          city: primeiro.city,
          state: primeiro.region,
          postcode: primeiro.postalCode,
        };
        label = [primeiro.street, primeiro.streetNumber, primeiro.city, primeiro.region].filter(Boolean).join(', ') || label;
      } catch {
        // fallback final
      }

      setEndereco((anterior) => ({
        ...anterior,
        addressQuery: label,
        addressLine: String(addr.road || addr.pedestrian || label),
        addressNumber: String(addr.house_number || 'S/N'),
        district: String(addr.suburb || addr.neighbourhood || ''),
        city: String(addr.city || addr.town || addr.village || 'Nao informado'),
        state: String(addr.state || 'NI'),
        zipCode: String(addr.postcode || '00000000').replace(/\D/g, ''),
      }));
      setSugestoesEndereco([]);
    } catch {
      Alert.alert('Localizacao', 'Falha ao buscar sua localizacao atual.');
    } finally {
      setLocalizandoAtual(false);
      setCarregandoMapa(false);
    }
  }

  async function confirmarResgate() {
    if (!token || !resgateModal) {
      return;
    }

    if (!endereco.addressQuery || !mapCoords) {
      Alert.alert('Endereco incompleto', 'Digite o endereco e clique em visualizar no mapa antes de confirmar.');
      return;
    }

    try {
      await resgatarItemLeilao(token, resgateModal.id, {
        ...endereco,
        paymentMethod: 'deposito_simulado',
        mapQuery: endereco.addressQuery,
      });
      setResgateModal(null);
      await carregar();
      Alert.alert('Sucesso', 'Resgate solicitado com pagamento simulado registrado.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel solicitar resgate.');
    }
  }

  async function confirmarRecebimento(redemptionId) {
    if (!token || !redemptionId) {
      return;
    }

    try {
      await confirmarRecebimentoItem(token, redemptionId);
      await carregar();
      Alert.alert('Sucesso', 'Recebimento confirmado com sucesso.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel confirmar recebimento.');
    }
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} />}
    >
      <Text style={styles.titulo}>Conquistas</Text>

      <View style={styles.card}>
        <Text style={styles.subtitulo}>Resumo</Text>
        <Text style={styles.info}>Leiloes vencidos: {totalVitorias}</Text>
        <Text style={styles.info}>Saldo: R$ {money(carteira.walletBalance)}</Text>
        <Text style={styles.info}>Reservado: R$ {money(carteira.walletReserved)}</Text>
        <Text style={styles.info}>Disponivel: R$ {money(carteira.walletAvailable)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitulo}>Leiloes vencidos</Text>
        {wins.map((item) => (
          <View key={item.id} style={styles.winItem}>
            {!!item.mediaUrl && <Image source={{ uri: montarUrlImagem(item.mediaUrl) }} style={styles.winImage} />}
            <Text style={styles.winTitulo}>{item.title}</Text>
            <Text style={styles.info}>Valor final: R$ {money(item.winnerBid)}</Text>
            <Text style={styles.info}>Resgate: {traduzirStatusResgate(item.redemptionStatus)}</Text>

            {!item.redemptionStatus ? (
              <Pressable style={styles.botaoSecundario} onPress={() => abrirResgate(item)}>
                <Text style={styles.textoBotao}>Resgatar item</Text>
              </Pressable>
            ) : null}

            {item.redemptionStatus === 'confirmed' ? (
              <Pressable style={styles.botaoSecundario} onPress={() => confirmarRecebimento(item.redemptionId)}>
                <Text style={styles.textoBotao}>Confirmar recebimento</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {!wins.length ? <Text style={styles.vazio}>Voce ainda nao venceu nenhum leilao.</Text> : null}
      </View>

      <Modal visible={Boolean(resgateModal)} transparent animationType="slide" onRequestClose={() => setResgateModal(null)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modal} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="always">
            <Text style={styles.subtitulo}>Resgatar item</Text>
            <Text style={styles.info}>Leilao: {resgateModal?.title}</Text>
            <Text style={styles.info}>Pagamento: Deposito simulado</Text>

            <TextInput
              style={styles.input}
              placeholder="Endereço completo"
              value={endereco.addressQuery}
              onChangeText={(v) => {
                setEndereco((s) => ({ ...s, addressQuery: v }));
                setMapCoords(null);
              }}
            />

            {carregandoSugestoes ? <Text style={styles.sugestaoInfo}>Buscando sugestoes...</Text> : null}

            {sugestoesEndereco.length ? (
              <View style={styles.sugestoesBox}>
                {sugestoesEndereco.map((item) => (
                  <Pressable key={item.id} style={styles.sugestaoItem} onPress={() => selecionarSugestao(item)}>
                    <Text style={styles.sugestaoTexto}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <TextInput style={styles.input} placeholder="Complemento" value={endereco.complement} onChangeText={(v) => setEndereco((s) => ({ ...s, complement: v }))} />

            <Pressable style={styles.botaoSecundario} onPress={visualizarMapa}>
              <Text style={styles.textoBotao}>{carregandoMapa ? 'Buscando mapa...' : 'Visualizar endereco no mapa'}</Text>
            </Pressable>

            <Pressable style={styles.botaoSecundario} onPress={usarLocalizacaoAtual} disabled={localizandoAtual}>
              <Text style={styles.textoBotao}>{localizandoAtual ? 'Localizando...' : 'Usar localizacao atual'}</Text>
            </Pressable>

            {!!mapCoords && (
              <>
                <MapView
                  style={styles.mapa}
                  initialRegion={{
                    latitude: mapCoords.latitude,
                    longitude: mapCoords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  region={{
                    latitude: mapCoords.latitude,
                    longitude: mapCoords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker coordinate={mapCoords} />
                </MapView>

                <Pressable style={styles.botaoSecundario} onPress={abrirRotaExterna}>
                  <Text style={styles.textoBotao}>Abrir rota no app de mapas</Text>
                </Pressable>
              </>
            )}

            <Pressable style={styles.botao} onPress={confirmarResgate}>
              <Text style={styles.textoBotao}>Confirmar resgate</Text>
            </Pressable>

            <Pressable style={styles.botaoFechar} onPress={() => setResgateModal(null)}>
              <Text style={styles.textoBotao}>Fechar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  conteudo: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  info: {
    color: '#334155',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipAtivo: {
    backgroundColor: '#0ea5e9',
  },
  chipTexto: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextoAtivo: {
    color: '#fff',
  },
  botao: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  botaoSecundario: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botaoFechar: {
    backgroundColor: '#64748b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: '700',
  },
  winItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  winImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#cbd5e1',
  },
  winTitulo: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 15,
  },
  vazio: {
    color: '#64748b',
    fontSize: 13,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    maxHeight: '88%',
    padding: 14,
  },
  mapa: {
    width: '100%',
    height: 170,
    borderRadius: 10,
    backgroundColor: '#cbd5e1',
  },
  sugestaoInfo: {
    color: '#64748b',
    fontSize: 12,
    marginTop: -2,
  },
  sugestoesBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sugestaoItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sugestaoTexto: {
    color: '#0f172a',
    fontSize: 12,
  },
});
