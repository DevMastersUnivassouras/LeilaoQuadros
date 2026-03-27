import React, { createContext, useContext, useEffect, useState } from 'react';

import {
  atualizarBiometria,
  atualizarPerfil,
  buscarMeuUsuario,
  cadastrarUsuario,
  excluirConta,
  enviarFotoPerfil,
  logarUsuario,
  removerFotoPerfil,
} from '../services/servico-auth';
import { pedirBiometria, podeUsarBiometria, verificarEstadoBiometria } from '../services/servico-biometria';
import {
  carregarSessao,
  limparSessao,
  limparTokenBiometria,
  pegarTokenBiometria,
  salvarSessao,
  salvarTokenBiometria,
} from '../storage/armazenamento-auth';

const ContextoAutenticacao = createContext(null);

export function ProvedorAutenticacao({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [podeMostrarBiometria, setPodeMostrarBiometria] = useState(false);

  async function atualizarBiometriaDisponivel() {
    const aparelhoSuportaBiometria = await podeUsarBiometria();
    setPodeMostrarBiometria(aparelhoSuportaBiometria);
  }

  async function buscarUsuarioPorTokenBiometria(tokenBiometria) {
    if (!tokenBiometria) {
      return null;
    }

    try {
      const dados = await buscarMeuUsuario(tokenBiometria);
      return dados?.user || null;
    } catch {
      return null;
    }
  }

  async function tentarAtivarBiometria(tokenAtual, userIdAtual) {
    const tokenBiometriaExistente = await pegarTokenBiometria();

    if (tokenBiometriaExistente) {
      const usuarioTokenBiometria = await buscarUsuarioPorTokenBiometria(tokenBiometriaExistente);
      const userIdTokenBiometria = String(usuarioTokenBiometria?.id || '');

      if (!userIdTokenBiometria) {
        await limparTokenBiometria();
      } else if (userIdTokenBiometria !== String(userIdAtual) && usuarioTokenBiometria?.biometricEnabled) {
        return {
          ativada: false,
          mensagem: 'Já existe biometria vinculada a outra conta neste aparelho. Remova nessa conta para cadastrar nesta.',
        };
      } else if (userIdTokenBiometria !== String(userIdAtual)) {
        await limparTokenBiometria();
      }
    }

    const estadoBiometria = await verificarEstadoBiometria();

    if (!estadoBiometria.disponivel) {
      return {
        ativada: false,
        mensagem: estadoBiometria.motivo,
      };
    }

    const respostaBiometria = await pedirBiometria('Autorize o uso da biometria neste app');

    if (!respostaBiometria.success) {
      return {
        ativada: false,
        mensagem: 'Biometria não autorizada. Você pode ativar depois.',
      };
    }

    await salvarTokenBiometria(tokenAtual);
    await atualizarBiometria(tokenAtual, true).catch(() => null);

    return {
      ativada: true,
      mensagem: '',
    };
  }

  useEffect(() => {
    async function iniciarSessao() {
      try {
        const sessao = await carregarSessao();
        if (!sessao) {
          await atualizarBiometriaDisponivel();
          return;
        }

        const dadosUsuario = await buscarMeuUsuario(sessao.token);
        setUsuario(dadosUsuario.user);
        setToken(sessao.token);
      } catch {
        await limparSessao();
      } finally {
        await atualizarBiometriaDisponivel();
        setCarregando(false);
      }
    }

    iniciarSessao();
  }, []);

  async function fazerLogin(payload, ativarBiometriaNoAparelho) {
    const respostaLogin = await logarUsuario(payload);
    await salvarSessao(respostaLogin.user, respostaLogin.token);

    let mensagemBiometria = '';

    if (ativarBiometriaNoAparelho) {
      const resultadoBiometria = await tentarAtivarBiometria(respostaLogin.token, respostaLogin.user?.id);
      if (resultadoBiometria.ativada) {
        respostaLogin.user.biometricEnabled = true;
      } else {
        mensagemBiometria = resultadoBiometria.mensagem;
      }
    }

    setUsuario(respostaLogin.user);
    setToken(respostaLogin.token);
    await atualizarBiometriaDisponivel();

    return {
      mensagemBiometria,
    };
  }

  async function fazerCadastro(payload, ativarBiometriaNoAparelho) {
    const respostaCadastro = await cadastrarUsuario(payload);
    await salvarSessao(respostaCadastro.user, respostaCadastro.token);

    let mensagemBiometria = '';

    if (ativarBiometriaNoAparelho) {
      const resultadoBiometria = await tentarAtivarBiometria(respostaCadastro.token, respostaCadastro.user?.id);
      if (resultadoBiometria.ativada) {
        respostaCadastro.user.biometricEnabled = true;
      } else {
        mensagemBiometria = resultadoBiometria.mensagem;
      }
    }

    setUsuario(respostaCadastro.user);
    setToken(respostaCadastro.token);
    await atualizarBiometriaDisponivel();

    return {
      mensagemBiometria,
    };
  }

  async function entrarComBiometria() {
    const tokenSalvoBiometria = await pegarTokenBiometria();

    if (!tokenSalvoBiometria) {
      throw new Error('Nenhuma conta biométrica vinculada neste aparelho. Entre com email e senha e ative a biometria em Configurações.');
    }

    const biometriaDisponivel = await podeUsarBiometria();
    if (!biometriaDisponivel) {
      throw new Error('Biometria não disponível neste aparelho.');
    }

    const respostaBiometria = await pedirBiometria();
    if (!respostaBiometria.success) {
      throw new Error('Autenticação biométrica cancelada ou falhou.');
    }

    const dadosUsuario = await buscarMeuUsuario(tokenSalvoBiometria);

    if (!dadosUsuario?.user?.biometricEnabled) {
      await limparTokenBiometria();
      await atualizarBiometriaDisponivel();
      throw new Error('Biometria não está ativada para esta conta.');
    }

    await salvarSessao(dadosUsuario.user, tokenSalvoBiometria);
    setUsuario(dadosUsuario.user);
    setToken(tokenSalvoBiometria);
  }

  async function sair() {
    await limparSessao();
    setUsuario(null);
    setToken(null);
    await atualizarBiometriaDisponivel();
  }

  async function desativarBiometriaNoAparelho() {
    if (token) {
      await atualizarBiometria(token, false).catch(() => null);
    }

    const tokenBiometria = await pegarTokenBiometria();
    const usuarioTokenBiometria = await buscarUsuarioPorTokenBiometria(tokenBiometria);
    const userIdTokenBiometria = String(usuarioTokenBiometria?.id || '');

    if (!userIdTokenBiometria || userIdTokenBiometria === String(usuario?.id || '')) {
      await limparTokenBiometria();
    }

    await atualizarBiometriaDisponivel();

    if (usuario) {
      const usuarioAtualizado = { ...usuario, biometricEnabled: false };
      setUsuario(usuarioAtualizado);
      if (token) {
        await salvarSessao(usuarioAtualizado, token);
      }
    }
  }

  async function ativarBiometriaNaContaAtual() {
    if (!token || !usuario?.id) {
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    const resultadoBiometria = await tentarAtivarBiometria(token, usuario.id);

    if (!resultadoBiometria.ativada) {
      throw new Error(resultadoBiometria.mensagem || 'Não foi possível ativar biometria.');
    }

    const usuarioAtualizado = { ...usuario, biometricEnabled: true };
    setUsuario(usuarioAtualizado);
    await salvarSessao(usuarioAtualizado, token);
    await atualizarBiometriaDisponivel();
  }

  async function atualizarDadosPerfil(payload) {
    if (!token) {
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    const resposta = await atualizarPerfil(token, payload);
    setUsuario(resposta.user);
    await salvarSessao(resposta.user, token);
    return resposta.user;
  }

  async function atualizarFotoPerfil(uriFoto) {
    if (!token) {
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    const resposta = await enviarFotoPerfil(token, uriFoto);
    setUsuario(resposta.user);
    await salvarSessao(resposta.user, token);
    return resposta.user;
  }

  async function removerFotoPerfilUsuario() {
    if (!token) {
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    const resposta = await removerFotoPerfil(token);
    setUsuario(resposta.user);
    await salvarSessao(resposta.user, token);
    return resposta.user;
  }

  async function excluirContaAtual() {
    if (!token) {
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    await excluirConta(token);
    await limparSessao();
    await limparTokenBiometria();
    setUsuario(null);
    setToken(null);
    await atualizarBiometriaDisponivel();
  }

  const value = {
    usuario,
    token,
    carregando,
    podeMostrarBiometria,
    fazerLogin,
    fazerCadastro,
    entrarComBiometria,
    sair,
    ativarBiometriaNaContaAtual,
    desativarBiometriaNoAparelho,
    atualizarDadosPerfil,
    atualizarFotoPerfil,
    removerFotoPerfilUsuario,
    excluirContaAtual,
  };

  return <ContextoAutenticacao.Provider value={value}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao() {
  const context = useContext(ContextoAutenticacao);

  if (!context) {
    throw new Error('useAutenticacao deve ser usado dentro de ProvedorAutenticacao');
  }

  return context;
}
