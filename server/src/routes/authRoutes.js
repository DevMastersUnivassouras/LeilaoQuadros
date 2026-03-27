const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const { pool } = require('../db/pool');
const { authMiddleware } = require('../middleware/authMiddleware');
const { loginSchema, registerSchema, updateProfileSchema } = require('../schemas/authSchema');
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

function buildToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
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

  const { email, firstName, lastName, password, biometricEnabled } = parsed.data;

  try {
    const existingUser = await pool.query('SELECT id FROM leilao_users WHERE email = $1', [email]);

    if (existingUser.rowCount > 0) {
      return res.status(409).json({ message: 'Email já cadastrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await pool.query(
      `INSERT INTO leilao_users (email, first_name, last_name, password_hash, biometric_enabled)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, profile_image_url, biometric_enabled`,
      [email, firstName, lastName, passwordHash, biometricEnabled],
    );

    const user = mapUser(created.rows[0]);
    const token = buildToken(user.id);

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

  const { email, password } = parsed.data;

  try {
    const found = await pool.query(
      `SELECT id, email, first_name, last_name, profile_image_url, password_hash, biometric_enabled
       FROM leilao_users
       WHERE email = $1`,
      [email],
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
    const token = buildToken(user.id);

    return res.json({ user, token });
  } catch {
    return res.status(500).json({ message: 'Erro ao autenticar usuário.' });
  }
});

authRoutes.patch('/biometric', authMiddleware, async (req, res) => {
  const enabled = Boolean(req.body?.enabled);

  try {
    const updated = await pool.query(
      `UPDATE leilao_users
       SET biometric_enabled = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, first_name, last_name, profile_image_url, biometric_enabled`,
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
      `SELECT id, email, first_name, last_name, profile_image_url, biometric_enabled
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

  const { firstName, lastName } = parsed.data;

  try {
    const updated = await pool.query(
      `UPDATE leilao_users
       SET first_name = $1, last_name = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, first_name, last_name, profile_image_url, biometric_enabled`,
      [firstName, lastName, req.user.sub],
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
         RETURNING id, email, first_name, last_name, profile_image_url, biometric_enabled`,
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
      `SELECT id, email, first_name, last_name, profile_image_url, biometric_enabled
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
       RETURNING id, email, first_name, last_name, profile_image_url, biometric_enabled`,
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
