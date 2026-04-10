const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const { pool } = require('../db/pool');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminLoginSchema, loginSchema, registerSchema, updateProfileSchema } = require('../schemas/authSchema');
const {
  pastaUploads,
  limparFotosOrfasLocais,
  montarNomeArquivo,
  removerImagemAntiga,
  salvarImagemNoStorage,
} = require('../services/servico-armazenamento');

const authRoutes = express.Router();
const tiposPermitidos = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const extensoesPermitidas = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const armazenamentoFoto = multer.diskStorage({
  destination: (_, __, cb) => {
    const pastaTemp = path.join(pastaUploads, '_tmp');
    fs.mkdirSync(pastaTemp, { recursive: true });
    cb(null, pastaTemp);
  },
  filename: (_, file, cb) => {
    const nomeFinal = montarNomeArquivo(file.originalname);
    cb(null, nomeFinal);
  },
});

const uploadFotoPerfil = multer({
  storage: armazenamentoFoto,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const tipo = String(file.mimetype || '').toLowerCase();
    const extensao = String(path.extname(file.originalname || '') || '').toLowerCase();

    if (!tiposPermitidos.has(tipo) || !extensoesPermitidas.has(extensao)) {
      return cb(new Error('Formato inválido. Envie JPG, JPEG, PNG ou WEBP.'));
    }

    return cb(null, true);
  },
});

function buildToken(userId, role) {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

async function garantirAdminSistema() {
  const senhaPadraoAdmin = String(process.env.ADMIN_PASSWORD || 'adminadmin');
  const hash = await bcrypt.hash(senhaPadraoAdmin, 10);

  const created = await pool.query(
    `INSERT INTO leilao_users (cpf, user_role, email, phone, first_name, last_name, password_hash, biometric_enabled, birth_date)
     VALUES ('00000000000', 'admin', 'admin@leilao.local', '00000000000', 'Admin', 'Sistema', $1, FALSE, NULL)
     ON CONFLICT (email)
     DO UPDATE SET user_role = 'admin', password_hash = EXCLUDED.password_hash, updated_at = NOW()
     RETURNING id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled`,
    [hash],
  );

  return created.rows[0];
}

function obterCpfsAdminConfigurados() {
  return String(process.env.ADMIN_CPFS || process.env.ADMIN_CPF || '')
    .split(',')
    .map((cpf) => cpf.replace(/\D/g, '').trim())
    .filter(Boolean);
}

function mapUser(row) {
  return {
    id: row.id,
    cpf: row.cpf,
    role: row.user_role,
    email: row.email,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    profileImageUrl: row.profile_image_url,
    biometricEnabled: row.biometric_enabled,
  };
}

authRoutes.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { cpf, email, phone, firstName, lastName, birthDate, password, biometricEnabled } = parsed.data;

  try {
    const existingUser = await pool.query('SELECT id FROM leilao_users WHERE cpf = $1 OR email = $2', [cpf, email]);

    if (existingUser.rowCount > 0) {
      return res.status(409).json({ message: 'CPF ou email já cadastrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cpfsAdmin = obterCpfsAdminConfigurados();
    const role = cpfsAdmin.includes(cpf) ? 'admin' : 'user';

    const created = await pool.query(
      `INSERT INTO leilao_users (cpf, user_role, email, phone, first_name, last_name, birth_date, password_hash, biometric_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled`,
      [cpf, role, email, phone, firstName, lastName, birthDate, passwordHash, biometricEnabled],
    );

    const user = mapUser(created.rows[0]);
    const token = buildToken(user.id, user.role);

    return res.status(201).json({ user, token });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
  }
});

authRoutes.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { cpf, password } = parsed.data;

  try {
    const found = await pool.query(
      `SELECT id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, password_hash, biometric_enabled
       FROM leilao_users
       WHERE cpf = $1`,
      [cpf],
    );

    if (found.rowCount === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const userRow = found.rows[0];
    const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const user = mapUser(userRow);
    const token = buildToken(user.id, user.role);

    return res.json({ user, token });
  } catch {
    return res.status(500).json({ message: 'Erro ao autenticar usuário.' });
  }
});

authRoutes.post('/admin/login', async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { adminId, password } = parsed.data;
  const idEsperado = String(process.env.ADMIN_LOGIN_ID || 'admin').trim().toLowerCase();
  const senhaEsperada = String(process.env.ADMIN_PASSWORD || 'adminadmin');

  try {
    if (String(adminId).trim().toLowerCase() !== idEsperado || password !== senhaEsperada) {
      return res.status(401).json({ message: 'Credenciais admin inválidas.' });
    }

    const userRow = await garantirAdminSistema();
    const user = mapUser(userRow);
    const token = buildToken(user.id, user.role);

    return res.json({ user, token });
  } catch {
    return res.status(500).json({ message: 'Erro ao autenticar administrador.' });
  }
});

authRoutes.post('/admin/bootstrap', async (req, res) => {
  const secret = String(req.body?.secret || '');
  const cpf = String(req.body?.cpf || '').replace(/\D/g, '');

  if (!secret || secret !== String(process.env.ADMIN_BOOTSTRAP_SECRET || '')) {
    return res.status(403).json({ message: 'Secret inválido para bootstrap admin.' });
  }

  if (cpf.length !== 11) {
    return res.status(400).json({ message: 'CPF inválido para bootstrap admin.' });
  }

  try {
    const updated = await pool.query(
      `UPDATE leilao_users
       SET user_role = 'admin', updated_at = NOW()
       WHERE cpf = $1
       RETURNING id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled`,
      [cpf],
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado para promover a admin.' });
    }

    return res.json({ user: mapUser(updated.rows[0]) });
  } catch {
    return res.status(500).json({ message: 'Erro ao promover usuário admin.' });
  }
});

authRoutes.patch('/biometric', authMiddleware, async (req, res) => {
  const enabled = Boolean(req.body?.enabled);

  try {
    const updated = await pool.query(
      `UPDATE leilao_users
       SET biometric_enabled = $1, updated_at = NOW()
       WHERE id = $2
      RETURNING id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled`,
      [enabled, req.user.sub],
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    return res.json({ user: mapUser(updated.rows[0]) });
  } catch {
    return res.status(500).json({ message: 'Erro ao atualizar biometria.' });
  }
});

authRoutes.get('/me', authMiddleware, async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled
       FROM leilao_users
       WHERE id = $1`,
      [req.user.sub],
    );

    if (found.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    return res.json({ user: mapUser(found.rows[0]) });
  } catch {
    return res.status(500).json({ message: 'Erro ao consultar usuário.' });
  }
});

authRoutes.patch('/profile', authMiddleware, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    console.error('[PATCH /api/auth/profile] Dados inválidos', {
      userId: req.user?.sub,
      body: req.body,
      fieldErrors: parsed.error.flatten().fieldErrors,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code,
        received: issue.received,
      })),
    });

    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { firstName, lastName, email, phone, birthDate } = parsed.data;

  try {
    const updated = await pool.query(
      `UPDATE leilao_users
       SET first_name = $1, last_name = $2, email = $3, phone = $4, birth_date = $5, updated_at = NOW()
       WHERE id = $6
      RETURNING id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled`,
      [firstName, lastName, email, phone, birthDate, req.user.sub],
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    return res.json({ user: mapUser(updated.rows[0]) });
  } catch {
    return res.status(500).json({ message: 'Erro ao atualizar perfil.' });
  }
});

authRoutes.post('/profile/photo', authMiddleware, (req, res) => {
  uploadFotoPerfil.single('photo')(req, res, async (errorUpload) => {
    if (errorUpload) {
      return res.status(400).json({ message: errorUpload.message || 'Erro ao enviar imagem.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Nenhuma imagem foi enviada.' });
    }

    const userId = String(req.user.sub);

    try {
      const atual = await pool.query(
        'SELECT profile_image_url FROM leilao_users WHERE id = $1',
        [userId],
      );

      const fotoAnterior = atual.rows?.[0]?.profile_image_url;
      const imagemNova = await salvarImagemNoStorage(req.file, userId);
      console.log('[POST /api/auth/profile/photo] Upload salvo', {
        userId,
        tipoStorage: imagemNova.tipoStorage,
        profileImageUrl: imagemNova.profileImageUrl,
      });

      const updated = await pool.query(
        `UPDATE leilao_users
         SET profile_image_url = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled`,
        [imagemNova.profileImageUrl, userId],
      );

      if (updated.rowCount === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      await removerImagemAntiga(fotoAnterior, userId, imagemNova.referencia);

      if (imagemNova.tipoStorage === 'local') {
        limparFotosOrfasLocais(userId, imagemNova.referencia);
      }

      return res.json({ user: mapUser(updated.rows[0]) });
    } catch {
      return res.status(500).json({ message: 'Erro ao salvar imagem de perfil.' });
    } finally {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });
});

authRoutes.delete('/profile/photo', authMiddleware, async (req, res) => {
  const userId = String(req.user.sub);

  try {
    const atual = await pool.query(
      `SELECT id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled
       FROM leilao_users
       WHERE id = $1`,
      [userId],
    );

    if (atual.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const fotoAnterior = atual.rows[0].profile_image_url;

    if (fotoAnterior) {
      await removerImagemAntiga(fotoAnterior, userId, null);
    }

    const updated = await pool.query(
      `UPDATE leilao_users
       SET profile_image_url = NULL, updated_at = NOW()
       WHERE id = $1
      RETURNING id, cpf, user_role, email, phone, first_name, last_name, birth_date, profile_image_url, biometric_enabled`,
      [userId],
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    limparFotosOrfasLocais(userId, '__nenhum__');

    return res.json({ user: mapUser(updated.rows[0]) });
  } catch (error) {
    console.error('Erro ao remover foto de perfil:', error);
    return res.status(500).json({ message: 'Erro ao remover foto de perfil.' });
  }
});

authRoutes.delete('/account', authMiddleware, async (req, res) => {
  const userId = String(req.user.sub);

  try {
    const atual = await pool.query(
      `SELECT id, profile_image_url
       FROM leilao_users
       WHERE id = $1`,
      [userId],
    );

    if (atual.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const fotoAnterior = atual.rows[0].profile_image_url;

    if (fotoAnterior) {
      await removerImagemAntiga(fotoAnterior, userId, null);
    }

    const deleted = await pool.query(
      `DELETE FROM leilao_users
       WHERE id = $1
       RETURNING id`,
      [userId],
    );

    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    limparFotosOrfasLocais(userId, '__nenhum__');

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    return res.status(500).json({ message: 'Erro ao excluir conta.' });
  }
});

module.exports = { authRoutes };
