const fs = require('fs');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');
const { createClient } = require('@supabase/supabase-js');

const pastaUploads = path.resolve(__dirname, '../../uploads');
let bucketSupabaseVerificado = null;

function apagarArquivoSePossivel(caminho) {
  try {
    if (fs.existsSync(caminho)) {
      fs.unlinkSync(caminho);
    }
  } catch {
    return;
  }
}

function pastaUsuarioLocal(userId) {
  return path.join(pastaUploads, 'users', String(userId));
}

function nomeArquivoLocal(caminhoRelativo) {
  return path.basename(String(caminhoRelativo || ''));
}

function obterConfigBlob() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER;
  const publicBaseUrl = process.env.AZURE_STORAGE_PUBLIC_BASE_URL;

  if (!connectionString || !containerName) {
    return null;
  }

  return {
    connectionString,
    containerName,
    publicBaseUrl,
  };
}

function obterConfigSupabaseStorage() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const folder = process.env.SUPABASE_STORAGE_FOLDER;
  const publicBaseUrl = process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL;

  if (!url || !serviceRoleKey || !bucket) {
    return null;
  }

  return {
    url,
    serviceRoleKey,
    bucket,
    folder,
    publicBaseUrl,
  };
}

function montarPathSupabase(config, userId, nomeArquivo) {
  const pasta = String(config.folder || '').replace(/^\/+|\/+$/g, '');
  const base = pasta ? `${pasta}/users/${userId}` : `users/${userId}`;
  return `${base}/${nomeArquivo}`;
}

function criarClienteSupabaseStorage(config) {
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function garantirBucketSupabase(config, clienteSupabase) {
  if (bucketSupabaseVerificado === config.bucket) {
    return;
  }

  const { data: buckets, error: erroListar } = await clienteSupabase.storage.listBuckets();

  if (erroListar) {
    throw erroListar;
  }

  const existe = (buckets || []).some((bucket) => bucket.name === config.bucket);
  const bucketExistente = (buckets || []).find((bucket) => bucket.name === config.bucket);

  if (!existe) {
    const { error: erroCriar } = await clienteSupabase.storage.createBucket(config.bucket, {
      public: true,
    });

    if (erroCriar && !String(erroCriar.message || '').toLowerCase().includes('already exists')) {
      throw erroCriar;
    }
  } else if (bucketExistente && !bucketExistente.public) {
    const { error: erroAtualizar } = await clienteSupabase.storage.updateBucket(config.bucket, {
      public: true,
    });

    if (erroAtualizar) {
      throw erroAtualizar;
    }
  }

  bucketSupabaseVerificado = config.bucket;
}

function caminhoRelativoLocal(userId, fileName) {
  return `/uploads/users/${userId}/${fileName}`;
}

function garantirPastaUsuario(userId) {
  fs.mkdirSync(pastaUsuarioLocal(userId), { recursive: true });
}

function montarNomeArquivo(originalName) {
  const ext = path.extname(originalName || '') || '.jpg';
  const safeExt = ext.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
}

async function salvarImagemNoStorage(file, userId) {
  const configSupabase = obterConfigSupabaseStorage();
  const configBlob = obterConfigBlob();

  if (configSupabase) {
    const clienteSupabase = criarClienteSupabaseStorage(configSupabase);
    await garantirBucketSupabase(configSupabase, clienteSupabase);

    const nome = montarNomeArquivo(file.originalname);
    const blobPath = montarPathSupabase(configSupabase, userId, nome);
    const bytes = fs.readFileSync(file.path);

    const { error: erroUpload } = await clienteSupabase.storage
      .from(configSupabase.bucket)
      .upload(blobPath, bytes, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: false,
      });

    if (erroUpload) {
      throw erroUpload;
    }

    const profileImageUrl = configSupabase.publicBaseUrl
      ? `${configSupabase.publicBaseUrl.replace(/\/$/, '')}/${blobPath}`
      : clienteSupabase.storage.from(configSupabase.bucket).getPublicUrl(blobPath).data.publicUrl;

    return {
      profileImageUrl,
      tipoStorage: 'supabase',
      referencia: blobPath,
    };
  }

  if (!configBlob) {
    garantirPastaUsuario(userId);
    const nome = montarNomeArquivo(file.originalname);
    const destino = path.join(pastaUsuarioLocal(userId), nome);
    fs.copyFileSync(file.path, destino);
    return {
      profileImageUrl: caminhoRelativoLocal(userId, nome),
      tipoStorage: 'local',
      referencia: nome,
    };
  }

  const blobService = BlobServiceClient.fromConnectionString(configBlob.connectionString);
  const container = blobService.getContainerClient(configBlob.containerName);
  await container.createIfNotExists();

  const nome = montarNomeArquivo(file.originalname);
  const blobPath = `users/${userId}/${nome}`;
  const blobClient = container.getBlockBlobClient(blobPath);

  await blobClient.uploadFile(file.path, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype || 'image/jpeg',
    },
  });

  const profileImageUrl = configBlob.publicBaseUrl
    ? `${configBlob.publicBaseUrl.replace(/\/$/, '')}/${blobPath}`
    : blobClient.url;

  return {
    profileImageUrl,
    tipoStorage: 'blob',
    referencia: blobPath,
  };
}

async function removerImagemAntiga(profileImageUrl, userId, referenciaNova) {
  if (!profileImageUrl) {
    return;
  }

  const configSupabase = obterConfigSupabaseStorage();
  const configBlob = obterConfigBlob();

  if (configSupabase && (profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://'))) {
    try {
      const clienteSupabase = criarClienteSupabaseStorage(configSupabase);
      const basePublica = String(configSupabase.publicBaseUrl || '').replace(/\/$/, '');
      let pathSemContainer = null;

      if (basePublica && profileImageUrl.startsWith(`${basePublica}/`)) {
        pathSemContainer = profileImageUrl.slice(basePublica.length + 1);
      }

      if (!pathSemContainer) {
        const url = new URL(profileImageUrl);
        const marcador = `/storage/v1/object/public/${configSupabase.bucket}/`;
        const indice = url.pathname.indexOf(marcador);

        if (indice >= 0) {
          pathSemContainer = url.pathname.slice(indice + marcador.length);
        }
      }

      if (pathSemContainer && pathSemContainer !== referenciaNova) {
        await clienteSupabase.storage.from(configSupabase.bucket).remove([pathSemContainer]).catch(() => null);
      }

      return;
    } catch {
      return;
    }
  }

  if (configBlob && (profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://'))) {
    try {
      const blobService = BlobServiceClient.fromConnectionString(configBlob.connectionString);
      const container = blobService.getContainerClient(configBlob.containerName);
      const url = new URL(profileImageUrl);
      const pathSemContainer = url.pathname.replace(`/${configBlob.containerName}/`, '').replace(/^\//, '');
      if (pathSemContainer && pathSemContainer !== referenciaNova) {
        await container.deleteBlob(pathSemContainer, { deleteSnapshots: 'include' }).catch(() => null);
      }
      return;
    } catch {
      return;
    }
  }

  if (profileImageUrl.startsWith(`/uploads/users/${userId}/`)) {
    const arquivo = nomeArquivoLocal(profileImageUrl);
    if (!arquivo || arquivo === referenciaNova) {
      return;
    }

    const caminho = path.join(pastaUsuarioLocal(userId), arquivo);
    apagarArquivoSePossivel(caminho);
  }
}

function limparFotosOrfasLocais(userId, arquivoAtual) {
  const pasta = pastaUsuarioLocal(userId);

  if (!fs.existsSync(pasta)) {
    return;
  }

  const arquivos = fs.readdirSync(pasta);

  for (const arquivo of arquivos) {
    if (arquivo !== arquivoAtual) {
      const caminho = path.join(pasta, arquivo);
      apagarArquivoSePossivel(caminho);
    }
  }
}

function obterModoStorageAtual() {
  if (obterConfigSupabaseStorage()) {
    return 'supabase';
  }

  if (obterConfigBlob()) {
    return 'azure-blob';
  }

  return 'local';
}

module.exports = {
  pastaUploads,
  obterConfigBlob,
  obterConfigSupabaseStorage,
  obterModoStorageAtual,
  caminhoRelativoLocal,
  montarNomeArquivo,
  salvarImagemNoStorage,
  removerImagemAntiga,
  limparFotosOrfasLocais,
};
