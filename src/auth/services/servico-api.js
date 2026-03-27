import { Platform } from 'react-native';

const urlBasePadrao = Platform.select({
  android: 'http://10.0.2.2:3333',
  ios: 'http://localhost:3333',
  default: 'http://localhost:3333',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || urlBasePadrao;
const TEMPO_LIMITE_MS = 12000;

function isBodyFormData(body) {
  return Boolean(body && typeof body.append === 'function');
}

function extrairMensagemErroApi(dados) {
  if (!dados) {
    return 'Erro na requisição';
  }

  if (dados?.message !== 'Dados inválidos.' || !dados?.errors) {
    return dados?.message || 'Erro na requisição';
  }

  const entradas = Object.entries(dados.errors || {});

  for (const [, errosCampo] of entradas) {
    if (Array.isArray(errosCampo) && errosCampo.length > 0) {
      return String(errosCampo[0]);
    }
  }

  return dados?.message || 'Erro na requisição';
}

export async function requisicaoApi(path, init = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
  const isFormData = isBodyFormData(init.body);
  const headers = {
    ...(init.headers || {}),
  };

  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const resposta = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controlador.signal,
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(extrairMensagemErroApi(dados));
    }

    return dados;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo esgotado para conectar na API. Verifique se o backend está rodando.');
    }

    if (error instanceof TypeError && String(error.message || '').includes('Network request failed')) {
      throw new Error('Falha de rede ao chamar a API. Confirme se o celular e o backend estão na mesma rede e se a URL da API está correta.');
    }

    if (error instanceof Error) {
      throw new Error(error.message || 'Falha ao conectar na API.');
    }

    throw new Error('Falha ao conectar na API.');
  } finally {
    clearTimeout(temporizador);
  }
}
