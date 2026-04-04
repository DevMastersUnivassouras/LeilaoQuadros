import { requisicaoApi } from './servico-api';

function authHeader(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function listarLeiloes(token, status = 'active') {
  return requisicaoApi(`/api/auctions?status=${encodeURIComponent(status)}`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function buscarCarteira(token) {
  return requisicaoApi('/api/auctions/wallet', {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function simularDeposito(token, amount) {
  return requisicaoApi('/api/auctions/wallet/deposit', {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ amount, method: 'deposito_simulado' }),
  });
}

export function listarLeiloesVencidos(token) {
  return requisicaoApi('/api/auctions/wins', {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function resgatarItemLeilao(token, auctionId, payload) {
  return requisicaoApi(`/api/auctions/${auctionId}/redeem`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function confirmarRecebimentoItem(token, redemptionId) {
  return requisicaoApi(`/api/auctions/redemptions/${redemptionId}/confirm-delivery`, {
    method: 'PATCH',
    headers: authHeader(token),
  });
}

export function buscarDetalheLeilao(token, auctionId) {
  return requisicaoApi(`/api/auctions/${auctionId}`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function enviarLance(token, auctionId, amount) {
  return requisicaoApi(`/api/auctions/${auctionId}/bids`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ amount }),
  });
}
