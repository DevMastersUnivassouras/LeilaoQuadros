import React from 'react';
import { Alert, Button, Image, StyleSheet, Text, View } from 'react-native';

import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';
import { API_BASE_URL } from '@/src/auth/services/servico-api';

function montarUrlImagem(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

export default function TelaInicio() {
  const { usuario, sair } = useAutenticacao();
  const fotoPerfil = montarUrlImagem(usuario?.profileImageUrl);

  async function aoClicarSair() {
    try {
      await sair();
    } catch {
      Alert.alert('Erro', 'Não foi possível sair da conta.');
    }
  }

  return (
    <View style={styles.caixaPrincipal}>
      <View style={styles.cabecalhoPerfil}>
        {fotoPerfil ? (
          <Image source={{ uri: fotoPerfil }} style={styles.avatarPerfilImagem} />
        ) : (
          <View style={styles.avatarPerfil}>
            <Text style={styles.iniciaisPerfil}>
              {(usuario?.firstName?.[0] || '').toUpperCase()}
              {(usuario?.lastName?.[0] || '').toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.dadosPerfil}>
          <Text style={styles.nomePerfil}>{usuario?.firstName} {usuario?.lastName}</Text>
          <Text style={styles.emailPerfil}>{usuario?.email}</Text>
        </View>
      </View>

      <View style={styles.corpoPagina}>
        <Text style={styles.titulo}>Home</Text>
        <Text style={styles.subtitulo}>Usuário autenticado com sucesso.</Text>

        <View style={styles.caixaBotao}>
          <Button title="Sair" onPress={aoClicarSair} color="#dc2626" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caixaPrincipal: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  cabecalhoPerfil: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#e2e8f0',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  avatarPerfil: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPerfilImagem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#cbd5e1',
  },
  iniciaisPerfil: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  dadosPerfil: {
    flex: 1,
  },
  nomePerfil: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
  },
  emailPerfil: {
    fontSize: 13,
    color: '#334155',
    marginTop: 2,
  },
  corpoPagina: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  subtitulo: {
    fontSize: 16,
    color: '#334155',
  },
  textoUsuario: {
    fontSize: 16,
    color: '#0f172a',
    marginTop: 6,
    fontWeight: '600',
  },
  caixaBotao: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 10,
  },
});
