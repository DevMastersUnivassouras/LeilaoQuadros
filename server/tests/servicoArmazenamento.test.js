const test = require('node:test');
const assert = require('node:assert/strict');

function limparCacheServico() {
  const modulo = require.resolve('../src/services/servico-armazenamento');
  delete require.cache[modulo];
}

function carregarServico() {
  limparCacheServico();
  return require('../src/services/servico-armazenamento');
}

function resetEnvStorage() {
  delete process.env.AZURE_STORAGE_CONNECTION_STRING;
  delete process.env.AZURE_STORAGE_CONTAINER;
  delete process.env.AZURE_STORAGE_PUBLIC_BASE_URL;
  delete process.env.SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_STORAGE_BUCKET;
  delete process.env.SUPABASE_STORAGE_FOLDER;
  delete process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL;
}

test('obterConfigSupabaseStorage retorna null sem env minima', () => {
  resetEnvStorage();
  const { obterConfigSupabaseStorage } = carregarServico();
  assert.equal(obterConfigSupabaseStorage(), null);
});

test('obterConfigSupabaseStorage monta configuracao com env', () => {
  resetEnvStorage();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_key';
  process.env.SUPABASE_STORAGE_BUCKET = 'fotos';
  process.env.SUPABASE_STORAGE_FOLDER = 'avatars';

  const { obterConfigSupabaseStorage } = carregarServico();
  const config = obterConfigSupabaseStorage();

  assert.equal(config.url, 'https://example.supabase.co');
  assert.equal(config.serviceRoleKey, 'service_role_key');
  assert.equal(config.bucket, 'fotos');
  assert.equal(config.folder, 'avatars');
});

test('obterModoStorageAtual respeita prioridade supabase > azure > local', () => {
  resetEnvStorage();
  let servico = carregarServico();
  assert.equal(servico.obterModoStorageAtual(), 'local');

  process.env.AZURE_STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
  process.env.AZURE_STORAGE_CONTAINER = 'fotos';
  servico = carregarServico();
  assert.equal(servico.obterModoStorageAtual(), 'azure-blob');

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_key';
  process.env.SUPABASE_STORAGE_BUCKET = 'fotos';
  servico = carregarServico();
  assert.equal(servico.obterModoStorageAtual(), 'supabase');
});

test('montarNomeArquivo preserva extensao e gera nome seguro', () => {
  const { montarNomeArquivo } = carregarServico();

  const nome = montarNomeArquivo('sample-image.png');
  assert.match(nome, /^\d+-\d+\.png$/);

  const nomePadrao = montarNomeArquivo('arquivo_sem_extensao');
  assert.match(nomePadrao, /^\d+-\d+\.jpg$/);
});
