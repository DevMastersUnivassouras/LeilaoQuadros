import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { API_BASE_URL } from '../../src/auth/services/servico-api';
import {
  criarLeilaoAdmin,
  editarLeilaoAdmin,
  enviarMidiaLeilaoAdmin,
  excluirLeilaoAdmin,
  listarLeiloesAdmin,
} from '../../src/auth/services/servico-admin';
import { useAutenticacao } from '../../src/auth/context/contexto-autenticacao';

const formularioVazio = {
  id: '',
  title: '',
  description: '',
  mediaUrl: '',
  startingBid: '1',
  minIncrement: '1',
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  status: 'scheduled',
  durationMinutes: '60',
};

const statusOptions = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'active', label: 'Ativo' },
  { value: 'cancelled', label: 'Cancelado' },
];

const duracoesPadrao = [15, 30, 60, 120, 180, 360, 720, 1440];

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

function traduzirStatusLeilao(status) {
  const mapa = {
    scheduled: 'Agendado',
    active: 'Ativo',
    cancelled: 'Cancelado',
    closed: 'Encerrado',
  };

  return mapa[String(status || '').toLowerCase()] || 'Desconhecido';
}

function montarUrlImagem(url) {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

export default function AdminLeiloesScreen() {
  const { token } = useAutenticacao();
  const [carregando, setCarregando] = useState(false);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [form, setForm] = useState(formularioVazio);
  const [leiloes, setLeiloes] = useState([]);

  const carregar = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      const resultado = await listarLeiloesAdmin(token);
      setLeiloes(resultado.auctions || []);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao carregar leiloes.');
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (form.id) {
      return;
    }

    const minutos = Number(form.durationMinutes || 0);
    if (!minutos || minutos <= 0) {
      return;
    }

    const agora = new Date();
    const inicio = form.status === 'active' ? agora : new Date(agora.getTime() + 5 * 60 * 1000);
    const fim = new Date(inicio.getTime() + minutos * 60 * 1000);

    setForm((anterior) => ({
      ...anterior,
      startsAt: inicio.toISOString(),
      endsAt: fim.toISOString(),
    }));
  }, [form.durationMinutes, form.status, form.id]);

  function editarLeilao(item) {
    const inicio = item.startsAt ? new Date(item.startsAt) : new Date();
    const fim = item.endsAt ? new Date(item.endsAt) : new Date(inicio.getTime() + 60 * 60 * 1000);
    const duracao = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / (60 * 1000)));

    setForm({
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      mediaUrl: item.mediaUrl || '',
      startingBid: String(item.startingBid || ''),
      minIncrement: String(item.minIncrement || ''),
      startsAt: inicio.toISOString(),
      endsAt: fim.toISOString(),
      status: item.status || 'scheduled',
      durationMinutes: String(duracao),
    });
  }

  async function selecionarMidiaGaleria() {
    if (!token) {
      return;
    }

    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert('Permissao necessaria', 'Autorize acesso a galeria para adicionar midia ao leilao.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (resultado.canceled || !resultado.assets?.length) {
        return;
      }

      const arquivo = resultado.assets[0];
      const payloadArquivo = {
        uri: String(arquivo.uri || ''),
        name: String(arquivo.fileName || `leilao-${Date.now()}.jpg`),
        type: String(arquivo.mimeType || 'image/jpeg'),
      };

      setEnviandoMidia(true);
      const uploaded = await enviarMidiaLeilaoAdmin(token, payloadArquivo);

      setForm((anterior) => ({
        ...anterior,
        mediaUrl: uploaded.mediaUrl || '',
      }));
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao enviar midia para o servidor.');
    } finally {
      setEnviandoMidia(false);
    }
  }

  async function salvarLeilao() {
    if (!token) {
      return;
    }

    try {
      setCarregando(true);
      const minutos = Number(form.durationMinutes || 0);
      let inicioIso = form.startsAt;
      let fimIso = form.endsAt;

      if (!form.id && (!minutos || minutos <= 0)) {
        throw new Error('Selecione uma duracao valida para o leilao.');
      }

      if (!form.id && form.status === 'active') {
        const agora = new Date();
        const fimAtivo = new Date(agora.getTime() + minutos * 60 * 1000);
        inicioIso = agora.toISOString();
        fimIso = fimAtivo.toISOString();
      }

      const payload = {
        title: form.title,
        description: form.description,
        mediaUrl: form.mediaUrl,
        startingBid: Number(form.startingBid),
        minIncrement: Number(form.minIncrement),
        startsAt: inicioIso,
        endsAt: fimIso,
        status: form.status,
      };

      if (form.id) {
        await editarLeilaoAdmin(token, form.id, payload);
      } else {
        await criarLeilaoAdmin(token, payload);
      }

      setForm(formularioVazio);
      await carregar();
      Alert.alert('Sucesso', 'Leilao salvo com sucesso.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel salvar o leilao.');
    } finally {
      setCarregando(false);
    }
  }

  async function removerLeilao(auctionId) {
    if (!token) {
      return;
    }

    Alert.alert('Excluir leilao', 'Tem certeza que deseja excluir este leilao?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            setCarregando(true);
            await excluirLeilaoAdmin(token, auctionId);
            await carregar();
          } catch (error) {
            Alert.alert('Erro', error?.message || 'Nao foi possivel excluir o leilao.');
          } finally {
            setCarregando(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} />}
    >
      <View style={styles.card}>
        <Text style={styles.subtitulo}>{form.id ? 'Editar leilao' : 'Novo leilao'}</Text>

        <TextInput style={styles.input} placeholder="Titulo do leilao" value={form.title} onChangeText={(v) => setForm((s) => ({ ...s, title: v }))} />
        <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Descricao" multiline value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} />

        <Text style={styles.label}>Status inicial</Text>
        <View style={styles.chipsLinha}>
          {statusOptions.map((status) => (
            <Pressable
              key={status.value}
              style={[styles.chip, form.status === status.value ? styles.chipAtivo : null]}
              onPress={() => setForm((s) => ({ ...s, status: status.value }))}
            >
              <Text style={[styles.chipTexto, form.status === status.value ? styles.chipTextoAtivo : null]}>{status.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Duracao (timer)</Text>
        <View style={styles.chipsLinha}>
          {duracoesPadrao.map((minutos) => (
            <Pressable
              key={String(minutos)}
              style={[styles.chip, Number(form.durationMinutes) === minutos ? styles.chipAtivo : null]}
              onPress={() => setForm((s) => ({ ...s, durationMinutes: String(minutos) }))}
            >
              <Text style={[styles.chipTexto, Number(form.durationMinutes) === minutos ? styles.chipTextoAtivo : null]}>
                {minutos >= 60 ? `${Math.round(minutos / 60)}h` : `${minutos}m`}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.gradeCampos}>
          <View style={styles.campoMetade}>
            <Text style={styles.label}>Lance inicial</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              value={form.startingBid}
              keyboardType="decimal-pad"
              onChangeText={(v) => setForm((s) => ({ ...s, startingBid: v }))}
              editable={!form.id}
            />
          </View>

          <View style={styles.campoMetade}>
            <Text style={styles.label}>Incremento minimo</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              value={form.minIncrement}
              keyboardType="decimal-pad"
              onChangeText={(v) => setForm((s) => ({ ...s, minIncrement: v }))}
            />
          </View>
        </View>

        <View style={styles.linhaTempoInfo}>
          <Text style={styles.infoTempo}>Inicio: {formatarDataHora(form.startsAt)}</Text>
          <Text style={styles.infoTempo}>Fim: {formatarDataHora(form.endsAt)}</Text>
        </View>

        <View style={styles.mediaBox}>
          <Text style={styles.label}>Midia do leilao</Text>
          {form.mediaUrl ? <Image source={{ uri: montarUrlImagem(form.mediaUrl) }} style={styles.previewMidia} /> : null}

          <View style={styles.mediaAcoes}>
            <Pressable style={styles.botaoMidia} onPress={selecionarMidiaGaleria} disabled={enviandoMidia || carregando}>
              <Text style={styles.textoBotao}>{enviandoMidia ? 'Enviando midia...' : 'Selecionar da galeria'}</Text>
            </Pressable>

            {form.mediaUrl ? (
              <Pressable style={styles.botaoSecundario} onPress={() => setForm((s) => ({ ...s, mediaUrl: '' }))}>
                <Text style={styles.textoBotaoSecundario}>Remover midia</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable style={styles.botaoPrimario} onPress={salvarLeilao} disabled={carregando}>
          <Text style={styles.textoBotao}>{carregando ? 'Salvando...' : form.id ? 'Atualizar Leilao' : 'Criar Leilao'}</Text>
        </Pressable>

        {form.id ? (
          <Pressable style={styles.botaoSecundario} onPress={() => setForm(formularioVazio)}>
            <Text style={styles.textoBotaoSecundario}>Cancelar edicao</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitulo}>Leiloes cadastrados</Text>
        {leiloes.map((item) => (
          <View key={item.id} style={styles.itemLinha}>
            <Text style={styles.itemTitulo}>{item.title}</Text>
            <View style={styles.tagsLinha}>
              <Text style={styles.tag}>{traduzirStatusLeilao(item.status)}</Text>
              <Text style={styles.tag}>Part.: {item.participantsCount}</Text>
              <Text style={styles.tag}>Lances: {item.bidsCount}</Text>
            </View>
            <Text style={styles.itemInfo}>Atual: R$ {formatarMoney(item.currentBid)} | Incremento: R$ {formatarMoney(item.minIncrement)}</Text>
            <Text style={styles.itemInfo}>Inicio: {formatarDataHora(item.startsAt)}</Text>
            <Text style={styles.itemInfo}>Fim: {formatarDataHora(item.endsAt)}</Text>
            <View style={styles.linhaAcoes}>
              <Pressable style={styles.acaoEditar} onPress={() => editarLeilao(item)}><Text style={styles.textoAcao}>Editar</Text></Pressable>
              <Pressable style={styles.acaoParticipantes} onPress={() => router.push(`/admin/participantes?auctionId=${encodeURIComponent(item.id)}`)}><Text style={styles.textoAcao}>Participantes</Text></Pressable>
              <Pressable style={styles.acaoExcluir} onPress={() => removerLeilao(item.id)}><Text style={styles.textoAcao}>Excluir</Text></Pressable>
            </View>
          </View>
        ))}
        {!leiloes.length ? <Text style={styles.vazio}>Sem leiloes cadastrados.</Text> : null}
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
  subtitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  label: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c9d7ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
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
  gradeCampos: {
    flexDirection: 'row',
    gap: 10,
  },
  campoMetade: {
    flex: 1,
    gap: 6,
  },
  linhaTempoInfo: {
    backgroundColor: '#eef4ff',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#d5e2ff',
  },
  infoTempo: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaBox: {
    gap: 8,
  },
  previewMidia: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#d7deef',
  },
  mediaAcoes: {
    flexDirection: 'row',
    gap: 8,
  },
  botaoMidia: {
    flex: 1,
    backgroundColor: '#1e40af',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botaoPrimario: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoSecundario: {
    backgroundColor: '#ebf1ff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cfdcff',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: '700',
  },
  textoBotaoSecundario: {
    color: '#1e293b',
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
  tagsLinha: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e6efff',
    color: '#1e40af',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
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
  linhaAcoes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  acaoEditar: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  acaoParticipantes: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  acaoExcluir: {
    backgroundColor: '#b91c1c',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  textoAcao: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
