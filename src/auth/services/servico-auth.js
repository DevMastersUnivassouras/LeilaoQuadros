import { requisicaoApi } from './servico-api';

export function cadastrarUsuario(payload) {
  return requisicaoApi('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logarUsuario(payload) {
  return requisicaoApi('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function buscarMeuUsuario(token) {
  return requisicaoApi('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function atualizarBiometria(token, enabled) {
  return requisicaoApi('/api/auth/biometric', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enabled }),
  });
}

export function atualizarPerfil(token, payload) {
  return requisicaoApi('/api/auth/profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

function descobrirTipoArquivo(uri, fileName, mimeType) {
  const nomeInformado = String(fileName || '');
  const tipoInformado = String(mimeType || '').toLowerCase();
  const extNome = nomeInformado.includes('.') ? nomeInformado.slice(nomeInformado.lastIndexOf('.')).toLowerCase() : '';

  if (tipoInformado.startsWith('image/') && extNome) {
    return { name: `perfil-${Date.now()}${extNome}`, type: tipoInformado };
  }

  if (tipoInformado.startsWith('image/')) {
    const extPorMime = tipoInformado === 'image/png'
      ? '.png'
      : tipoInformado === 'image/webp'
        ? '.webp'
        : '.jpg';
    return { name: `perfil-${Date.now()}${extPorMime}`, type: tipoInformado };
  }

  const uriLower = String(uri || '').toLowerCase();
  if (uriLower.endsWith('.png')) {
    return { name: `perfil-${Date.now()}.png`, type: 'image/png' };
  }
  if (uriLower.endsWith('.webp')) {
    return { name: `perfil-${Date.now()}.webp`, type: 'image/webp' };
  }
  return { name: `perfil-${Date.now()}.jpg`, type: 'image/jpeg' };
}

function normalizarUriUpload(uri) {
  const uriString = String(uri || '');

  if (!uriString) {
    return uriString;
  }

  if (uriString.startsWith('file://') || uriString.startsWith('content://')) {
    return uriString;
  }

  if (uriString.startsWith('/')) {
    return `file://${uriString}`;
  }

  return uriString;
}

function extrairDadosFoto(foto) {
  if (foto && typeof foto === 'object') {
    return {
      uri: normalizarUriUpload(foto.uri),
      fileName: String(foto.fileName || ''),
      mimeType: String(foto.mimeType || ''),
    };
  }

  return {
    uri: normalizarUriUpload(foto),
    fileName: '',
    mimeType: '',
  };
}

function criarFormDataFoto(dadosFoto) {
  const { name, type } = descobrirTipoArquivo(dadosFoto.uri, dadosFoto.fileName, dadosFoto.mimeType);
  const formData = new FormData();

  formData.append('photo', {
    uri: dadosFoto.uri,
    name,
    type,
  });

  return formData;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function enviarFotoPerfil(token, uriFoto) {
  const dadosFoto = extrairDadosFoto(uriFoto);
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  try {
    return await requisicaoApi('/api/auth/profile/photo', {
      method: 'POST',
      headers,
      body: criarFormDataFoto(dadosFoto),
    });
  } catch (error) {
    const mensagem = String(error?.message || '');
    const falhaRedeIntermitente = mensagem.includes('Falha de rede ao chamar a API');

    if (!falhaRedeIntermitente) {
      throw error;
    }

    await esperar(450);

    return requisicaoApi('/api/auth/profile/photo', {
      method: 'POST',
      headers,
      body: criarFormDataFoto(dadosFoto),
    });
  }
}

export function removerFotoPerfil(token) {
  return requisicaoApi('/api/auth/profile/photo', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function excluirConta(token) {
  return requisicaoApi('/api/auth/account', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
