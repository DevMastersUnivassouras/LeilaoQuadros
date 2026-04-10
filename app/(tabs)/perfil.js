import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';

import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';
import { API_BASE_URL } from '@/src/auth/services/servico-api';
import { escolherFotoDaGaleria, tirarFotoAgora } from '@/src/auth/services/servico-foto';
import { buscarCarteira, simularDeposito } from '@/src/auth/services/servico-leilao';

function montarUrlImagem(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

function formatarDataNascimentoParaTela(valor) {
  const dataLimpa = String(valor || '').trim();
  const regexIso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const matchIso = dataLimpa.match(regexIso);

  if (!matchIso) {
    return dataLimpa;
  }

  const [, ano, mes, dia] = matchIso;
  return `${dia}/${mes}/${ano}`;
}

function normalizarDataNascimentoParaApi(valor) {
  const dataLimpa = String(valor || '').trim();
  const regexBrasil = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const regexIso = /^(\d{4})-(\d{2})-(\d{2})$/;

  const matchBrasil = dataLimpa.match(regexBrasil);
  if (matchBrasil) {
    const [, dia, mes, ano] = matchBrasil;
    return `${ano}-${mes}-${dia}`;
  }

  if (regexIso.test(dataLimpa)) {
    return dataLimpa;
  }

  return '';
}

function formatarDataParaTela(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = String(data.getFullYear());
  return `${dia}/${mes}/${ano}`;
}

function converterIsoParaDate(valor) {
  const iso = normalizarDataNascimentoParaApi(valor);
  if (!iso) {
    return new Date(2000, 0, 1);
  }

  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function validarDataNascimento(valor) {
  const iso = normalizarDataNascimentoParaApi(valor);

  if (!iso) {
    return false;
  }

  const [ano, mes, dia] = iso.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    data.getUTCFullYear() === ano
    && data.getUTCMonth() === mes - 1
    && data.getUTCDate() === dia
  );
}

export default function TelaPerfil() {
  const { usuario, token, atualizarDadosPerfil, atualizarFotoPerfil, removerFotoPerfilUsuario } = useAutenticacao();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [dataNascimentoDate, setDataNascimentoDate] = useState(new Date(2000, 0, 1));
  const [mostrarSeletorData, setMostrarSeletorData] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [acaoFoto, setAcaoFoto] = useState('');
  const [previewFoto, setPreviewFoto] = useState(null);
  const [carteira, setCarteira] = useState({ walletBalance: 0, walletReserved: 0, walletAvailable: 0 });
  const [depositoValor, setDepositoValor] = useState('100');
  const [depositando, setDepositando] = useState(false);

  useEffect(() => {
    setNome(usuario?.firstName || '');
    setSobrenome(usuario?.lastName || '');
    setEmail(usuario?.email || '');
    setTelefone(usuario?.phone || '');
    setDataNascimento(formatarDataNascimentoParaTela(usuario?.birthDate || ''));
    setDataNascimentoDate(converterIsoParaDate(usuario?.birthDate || ''));
  }, [usuario?.firstName, usuario?.lastName, usuario?.email, usuario?.phone, usuario?.birthDate]);

  function abrirSeletorData() {
    setMostrarSeletorData(true);
  }

  function aoSelecionarData(event, dataSelecionada) {
    if (Platform.OS === 'android') {
      setMostrarSeletorData(false);
    }

    if (event?.type === 'dismissed' || !dataSelecionada) {
      return;
    }

    setDataNascimentoDate(dataSelecionada);
    setDataNascimento(formatarDataParaTela(dataSelecionada));

    if (Platform.OS !== 'android') {
      setMostrarSeletorData(false);
    }
  }

  const carregarResumoPerfil = useCallback(async () => {
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

  useFocusEffect(
    useCallback(() => {
      carregarResumoPerfil();
    }, [carregarResumoPerfil]),
  );

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
    const emailFinal = email.trim().toLowerCase();
    const telefoneFinal = telefone.trim();
    const dataNascimentoFinal = dataNascimento.trim();
    const dataNascimentoFinalIso = normalizarDataNascimentoParaApi(dataNascimentoFinal);

    if (!nomeFinal || !sobrenomeFinal || !emailFinal || !telefoneFinal || !dataNascimentoFinal) {
      Alert.alert('Atenção', 'Nome, sobrenome, data de nascimento, email e telefone são obrigatórios.');
      return;
    }

    if (!validarDataNascimento(dataNascimentoFinal)) {
      Alert.alert('Atenção', 'Data de nascimento inválida. Use o calendário para selecionar.');
      return;
    }

    try {
      setSalvandoDados(true);
      await atualizarDadosPerfil({
        firstName: nomeFinal,
        lastName: sobrenomeFinal,
        email: emailFinal,
        phone: telefoneFinal,
        birthDate: dataNascimentoFinalIso,
      });
      Alert.alert('Sucesso', 'Perfil atualizado no banco de dados.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar seu perfil.');
    } finally {
      setSalvandoDados(false);
    }
  }

  async function depositarSaldo() {
    if (!token) {
      return;
    }

    const valor = Number(depositoValor);
    if (!Number.isFinite(valor) || valor <= 0) {
      Alert.alert('Valor invalido', 'Informe um valor valido para deposito.');
      return;
    }

    try {
      setDepositando(true);
      await simularDeposito(token, valor);
      const walletRes = await buscarCarteira(token);
      setCarteira(walletRes.wallet || { walletBalance: 0, walletReserved: 0, walletAvailable: 0 });
      Alert.alert('Sucesso', 'Deposito simulado registrado na sua conta.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel registrar deposito.');
    } finally {
      setDepositando(false);
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
    <ScrollView style={styles.tela} contentContainerStyle={styles.telaConteudo}>
      <Text style={styles.titulo}>Perfil</Text>

      <View style={styles.cartaoAvatar}>
        {fotoPerfil ? (
          <Image source={{ uri: fotoPerfil }} style={styles.imagemAvatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.textoIniciais}>{iniciais || 'U'}</Text>
          </View>
        )}

        <Text style={styles.email}>CPF: {usuario?.cpf}</Text>

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
        <View style={styles.boxSaldo}>
          <Text style={styles.label}>Saldo simulado</Text>
          <Text style={styles.textoSaldo}>Balance: R$ {Number(carteira.walletBalance || 0).toFixed(2)}</Text>
          <Text style={styles.textoSaldoAux}>Reservado: R$ {Number(carteira.walletReserved || 0).toFixed(2)}</Text>
          <Text style={styles.textoSaldoAux}>Disponivel: R$ {Number(carteira.walletAvailable || 0).toFixed(2)}</Text>

          <TextInput
            value={depositoValor}
            onChangeText={setDepositoValor}
            style={styles.input}
            placeholder="Valor para deposito"
            keyboardType="decimal-pad"
          />

          <Pressable onPress={depositarSaldo} style={styles.botaoDeposito} disabled={depositando}>
            <Text style={styles.textoBotaoPrincipal}>{depositando ? 'Depositando...' : 'Depositar saldo'}</Text>
          </Pressable>
        </View>

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

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder="Seu email"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Data de nascimento</Text>
        <Pressable onPress={abrirSeletorData} style={styles.input}>
          <Text style={dataNascimento ? styles.textoInputData : styles.textoPlaceholderData}>
            {dataNascimento || 'Selecionar no calendário'}
          </Text>
        </Pressable>

        {mostrarSeletorData && (
          <DateTimePicker
            value={dataNascimentoDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={aoSelecionarData}
          />
        )}

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          value={telefone}
          onChangeText={setTelefone}
          style={styles.input}
          placeholder="Seu telefone"
          keyboardType="phone-pad"
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  telaConteudo: {
    padding: 20,
    gap: 14,
    paddingBottom: 30,
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
  boxSaldo: {
    backgroundColor: '#ecfeff',
    borderRadius: 12,
    padding: 8,
    gap: 6,
    marginBottom: 8,
  },
  textoSaldo: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  textoSaldoAux: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '700',
  },
  botaoDeposito: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
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
    paddingVertical: 8,
    color: '#0f172a',
    marginBottom: 4,
  },
  textoInputData: {
    color: '#0f172a',
  },
  textoPlaceholderData: {
    color: '#94a3b8',
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
