import { requisicaoApi } from './servico-api';

function authHeader(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function listarLeiloesAdmin(token, status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return requisicaoApi(`/api/admin/auctions${query}`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function criarLeilaoAdmin(token, payload) {
  return requisicaoApi('/api/admin/auctions', {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function editarLeilaoAdmin(token, auctionId, payload) {
  return requisicaoApi(`/api/admin/auctions/${auctionId}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function excluirLeilaoAdmin(token, auctionId) {
  return requisicaoApi(`/api/admin/auctions/${auctionId}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });
}

export function listarVencedoresAdmin(token) {
  return requisicaoApi('/api/admin/winners', {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function listarParticipantesAdmin(token, auctionId) {
  return requisicaoApi(`/api/admin/auctions/${auctionId}/participants`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function enviarMidiaLeilaoAdmin(token, arquivo) {
  const formData = new FormData();

  formData.append('media', {
    uri: arquivo.uri,
    name: arquivo.name,
    type: arquivo.type,
  });

  return requisicaoApi('/api/admin/media', {
    method: 'POST',
    headers: authHeader(token),
    body: formData,
  });
}

export function listarResgatesAdmin(token) {
  return requisicaoApi('/api/admin/redemptions', {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function atualizarStatusResgateAdmin(token, redemptionId, status) {
  return requisicaoApi(`/api/admin/redemptions/${redemptionId}/status`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ status }),
  });
}
