import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';
import { API_BASE_URL } from '@/src/auth/services/servico-api';
import { escolherFotoDaGaleria, tirarFotoAgora } from '@/src/auth/services/servico-foto';

function montarUrlImagem(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

export default function TelaPerfil() {
  const { usuario, atualizarDadosPerfil, atualizarFotoPerfil, removerFotoPerfilUsuario } = useAutenticacao();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [acaoFoto, setAcaoFoto] = useState('');
  const [previewFoto, setPreviewFoto] = useState(null);

  useEffect(() => {
    setNome(usuario?.firstName || '');
    setSobrenome(usuario?.lastName || '');
  }, [usuario?.firstName, usuario?.lastName]);

  const iniciais = useMemo(() => {
    const a = (usuario?.firstName?.[0] || '').toUpperCase();
    const b = (usuario?.lastName?.[0] || '').toUpperCase();
    return `${a}${b}`;
  }, [usuario?.firstName, usuario?.lastName]);

  const fotoPerfil = montarUrlImagem(usuario?.profileImageUrl);
  const fotoOcupada = acaoFoto !== '';

  async function salvarPerfil() {
    const nomeFinal = nome.trim();
    const sobrenomeFinal = sobrenome.trim();

    if (!nomeFinal || !sobrenomeFinal) {
      Alert.alert('Atenção', 'Nome e sobrenome são obrigatórios.');
      return;
    }

    try {
      setSalvandoDados(true);
      await atualizarDadosPerfil({
        firstName: nomeFinal,
        lastName: sobrenomeFinal,
      });
      Alert.alert('Sucesso', 'Perfil atualizado no banco de dados.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar seu perfil.');
    } finally {
      setSalvandoDados(false);
    }
  }

  async function enviarFoto(fotoSelecionada) {
    if (!fotoSelecionada?.uri) {
      return;
    }

    try {
      setAcaoFoto('enviando');
      await atualizarFotoPerfil(fotoSelecionada);
      Alert.alert('Sucesso', 'Foto de perfil atualizada.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar a foto.');
    } finally {
      setAcaoFoto('');
    }
  }

  async function escolherDaGaleria() {
    try {
      setAcaoFoto('galeria');
      const fotoSelecionada = await escolherFotoDaGaleria();
      if (fotoSelecionada?.uri) {
        setPreviewFoto(fotoSelecionada);
      }
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao abrir galeria.');
    } finally {
      setAcaoFoto('');
    }
  }

  async function tirarFoto() {
    try {
      setAcaoFoto('camera');
      const fotoSelecionada = await tirarFotoAgora();
      if (fotoSelecionada?.uri) {
        setPreviewFoto(fotoSelecionada);
      }
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao abrir câmera.');
    } finally {
      setAcaoFoto('');
    }
  }

  async function confirmarPreview() {
    const fotoFinal = previewFoto;
    setPreviewFoto(null);
    await enviarFoto(fotoFinal);
  }

  function removerFoto() {
    Alert.alert('Remover foto', 'Deseja remover sua foto de perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            setAcaoFoto('removendo');
            await removerFotoPerfilUsuario();
            Alert.alert('Sucesso', 'Foto de perfil removida.');
          } catch (error) {
            Alert.alert('Erro', error?.message || 'Não foi possível remover a foto.');
          } finally {
            setAcaoFoto('');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.tela}>
      <Text style={styles.titulo}>Perfil</Text>

      <View style={styles.cartaoAvatar}>
        {fotoPerfil ? (
          <Image source={{ uri: fotoPerfil }} style={styles.imagemAvatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.textoIniciais}>{iniciais || 'U'}</Text>
          </View>
        )}

        <Text style={styles.email}>{usuario?.email}</Text>

        <View style={styles.linhaBotoesFoto}>
          <Pressable onPress={escolherDaGaleria} style={styles.botaoSecundario} disabled={fotoOcupada}>
            <Text style={styles.textoBotaoSecundario}>
              {acaoFoto === 'galeria' ? 'Abrindo galeria...' : acaoFoto === 'enviando' ? 'Enviando...' : 'Galeria'}
            </Text>
          </Pressable>

          <Pressable onPress={tirarFoto} style={styles.botaoSecundario} disabled={fotoOcupada}>
            <Text style={styles.textoBotaoSecundario}>
              {acaoFoto === 'camera' ? 'Abrindo câmera...' : acaoFoto === 'enviando' ? 'Enviando...' : 'Câmera'}
            </Text>
          </Pressable>
        </View>

        {!!fotoPerfil && (
          <Pressable onPress={removerFoto} style={styles.botaoRemoverFoto} disabled={fotoOcupada}>
            <Text style={styles.textoBotaoRemoverFoto}>{acaoFoto === 'removendo' ? 'Removendo...' : 'Remover foto'}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.cartaoDados}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          value={nome}
          onChangeText={setNome}
          style={styles.input}
          placeholder="Seu nome"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Sobrenome</Text>
        <TextInput
          value={sobrenome}
          onChangeText={setSobrenome}
          style={styles.input}
          placeholder="Seu sobrenome"
          autoCapitalize="words"
        />

        <Pressable onPress={salvarPerfil} style={styles.botaoPrincipal} disabled={salvandoDados}>
          <Text style={styles.textoBotaoPrincipal}>{salvandoDados ? 'Salvando...' : 'Salvar Alterações'}</Text>
        </Pressable>
      </View>

      <Modal transparent visible={Boolean(previewFoto)} animationType="fade" onRequestClose={() => setPreviewFoto(null)}>
        <View style={styles.overlayModal}>
          <View style={styles.caixaModal}>
            <Text style={styles.tituloModal}>Preview da foto</Text>

            {!!previewFoto?.uri && <Image source={{ uri: previewFoto.uri }} style={styles.imagemPreview} />}

            <View style={styles.linhaModalBotoes}>
              <Pressable style={styles.botaoCancelar} onPress={() => setPreviewFoto(null)}>
                <Text style={styles.textoBotaoCancelar}>Cancelar</Text>
              </Pressable>

              <Pressable style={styles.botaoConfirmar} onPress={confirmarPreview}>
                <Text style={styles.textoBotaoConfirmar}>{acaoFoto === 'enviando' ? 'Enviando...' : 'Usar foto'}</Text>
              </Pressable>
            </View>
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
    padding: 20,
    gap: 14,
  },
  titulo: {
    marginTop: 20,
    fontSize: 28,
    color: '#0f172a',
    fontWeight: '800',
  },
  cartaoAvatar: {
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#cbd5e1',
  },
  textoIniciais: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 30,
  },
  email: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  linhaBotoesFoto: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  botaoSecundario: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoBotaoSecundario: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  botaoRemoverFoto: {
    width: '100%',
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoBotaoRemoverFoto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cartaoDados: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  label: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    marginBottom: 6,
  },
  botaoPrincipal: {
    marginTop: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  textoBotaoPrincipal: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  overlayModal: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  caixaModal: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  tituloModal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  imagemPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  linhaModalBotoes: {
    flexDirection: 'row',
    gap: 8,
  },
  botaoCancelar: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoBotaoCancelar: {
    color: '#0f172a',
    fontWeight: '700',
  },
  botaoConfirmar: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoBotaoConfirmar: {
    color: '#fff',
    fontWeight: '700',
  },
});
