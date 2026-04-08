const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { z } = require('zod');

const { pool } = require('../db/pool');
const { montarNomeArquivo, pastaUploads, salvarImagemNoStorage } = require('../services/servico-armazenamento');

const adminRoutes = express.Router();
const tiposPermitidos = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const extensoesPermitidas = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const armazenamentoMidiaLeilao = multer.diskStorage({
  destination: (_, __, cb) => {
    const pastaTemp = path.join(pastaUploads, '_tmp');
    fs.mkdirSync(pastaTemp, { recursive: true });
    cb(null, pastaTemp);
  },
  filename: (_, file, cb) => {
    cb(null, montarNomeArquivo(file.originalname));
  },
});

const uploadMidiaLeilao = multer({
  storage: armazenamentoMidiaLeilao,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const tipo = String(file.mimetype || '').toLowerCase();
    const extensao = String(path.extname(file.originalname || '') || '').toLowerCase();

    if (!tiposPermitidos.has(tipo) || !extensoesPermitidas.has(extensao)) {
      return cb(new Error('Formato inválido. Envie JPG, JPEG, PNG ou WEBP.'));
    }

    return cb(null, true);
  },
});

const createAuctionSchema = z
  .object({
    title: z.string().trim().min(3, 'Título obrigatório'),
    description: z.string().trim().optional().default(''),
    mediaUrl: z.string().trim().optional().default(''),
    startingBid: z.coerce.number().positive('Lance inicial inválido'),
    minIncrement: z.coerce.number().positive('Incremento mínimo inválido').default(1),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    status: z.enum(['scheduled', 'active', 'cancelled']).optional().default('scheduled'),
  })
  .refine((data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(), {
    message: 'Fim deve ser maior que início.',
    path: ['endsAt'],
  });

const updateAuctionSchema = z
  .object({
    title: z.string().trim().min(3, 'Título obrigatório'),
    description: z.string().trim().optional().default(''),
    mediaUrl: z.string().trim().optional().default(''),
    minIncrement: z.coerce.number().positive('Incremento mínimo inválido'),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    status: z.enum(['scheduled', 'active', 'closed', 'cancelled']),
  })
  .refine((data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(), {
    message: 'Fim deve ser maior que início.',
    path: ['endsAt'],
  });

const updateRedemptionStatusSchema = z.object({
  status: z.enum(['confirmed']),
});

adminRoutes.post('/media', uploadMidiaLeilao.single('media'), async (req, res) => {
  const arquivo = req.file;

  if (!arquivo) {
    return res.status(400).json({ message: 'Arquivo de mídia não enviado.' });
  }

  try {
    const uploaded = await salvarImagemNoStorage(arquivo, req.user.sub, {
      pathPrefix: `admins/${req.user.sub}/auctions`,
    });

    return res.status(201).json({ mediaUrl: uploaded.profileImageUrl });
  } catch {
    return res.status(500).json({ message: 'Erro ao enviar mídia do leilão.' });
  } finally {
    fs.unlink(arquivo.path, () => null);
  }
});

adminRoutes.get('/auctions', async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const params = [];
    let filtro = '';

    if (status) {
      params.push(status);
      filtro = 'WHERE a.status = $1';
    }

    const found = await pool.query(
      `SELECT
         a.id,
         a.title,
         a.description,
         a.media_url AS "mediaUrl",
         a.starting_bid AS "startingBid",
         a.current_bid AS "currentBid",
         a.min_increment AS "minIncrement",
         a.starts_at AS "startsAt",
         a.ends_at AS "endsAt",
         a.status,
         a.winner_bid AS "winnerBid",
         a.created_at AS "createdAt",
         a.updated_at AS "updatedAt",
         COALESCE(m.bids_count, 0) AS "bidsCount",
         COALESCE(m.participants_count, 0) AS "participantsCount"
       FROM leilao_auctions a
       LEFT JOIN (
         SELECT
           b.auction_id,
           COUNT(*)::int AS bids_count,
           COUNT(DISTINCT b.user_id)::int AS participants_count
         FROM leilao_bids b
         GROUP BY b.auction_id
       ) m ON m.auction_id = a.id
       ${filtro}
       ORDER BY a.starts_at DESC`,
      params,
    );

    return res.json({ auctions: found.rows });
  } catch {
    return res.status(500).json({ message: 'Erro ao listar leilões.' });
  }
});

adminRoutes.post('/auctions', async (req, res) => {
  const parsed = createAuctionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  try {
    const created = await pool.query(
      `INSERT INTO leilao_auctions (
         title,
         description,
         media_url,
         starting_bid,
         current_bid,
         min_increment,
         starts_at,
         ends_at,
         status,
         created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING
         id,
         title,
         description,
         media_url AS "mediaUrl",
         starting_bid AS "startingBid",
         current_bid AS "currentBid",
         min_increment AS "minIncrement",
         starts_at AS "startsAt",
         ends_at AS "endsAt",
         status,
         winner_bid AS "winnerBid",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [
        data.title,
        data.description || null,
        data.mediaUrl || null,
        data.startingBid,
        data.startingBid,
        data.minIncrement,
        new Date(data.startsAt).toISOString(),
        new Date(data.endsAt).toISOString(),
        data.status,
        req.user.sub,
      ],
    );

    return res.status(201).json({ auction: created.rows[0] });
  } catch {
    return res.status(500).json({ message: 'Erro ao criar leilão.' });
  }
});

adminRoutes.patch('/auctions/:auctionId', async (req, res) => {
  const parsed = updateAuctionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  try {
    const updated = await pool.query(
      `UPDATE leilao_auctions
       SET
         title = $1,
         description = $2,
         media_url = $3,
         min_increment = $4,
         starts_at = $5,
         ends_at = $6,
         status = $7,
         updated_at = NOW()
       WHERE id = $8
       RETURNING
         id,
         title,
         description,
         media_url AS "mediaUrl",
         starting_bid AS "startingBid",
         current_bid AS "currentBid",
         min_increment AS "minIncrement",
         starts_at AS "startsAt",
         ends_at AS "endsAt",
         status,
         winner_bid AS "winnerBid",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [
        data.title,
        data.description || null,
        data.mediaUrl || null,
        data.minIncrement,
        new Date(data.startsAt).toISOString(),
        new Date(data.endsAt).toISOString(),
        data.status,
        req.params.auctionId,
      ],
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: 'Leilão não encontrado.' });
    }

    return res.json({ auction: updated.rows[0] });
  } catch {
    return res.status(500).json({ message: 'Erro ao editar leilão.' });
  }
});

adminRoutes.delete('/auctions/:auctionId', async (req, res) => {
  try {
    const deleted = await pool.query('DELETE FROM leilao_auctions WHERE id = $1 RETURNING id', [req.params.auctionId]);

    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: 'Leilão não encontrado.' });
    }

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Erro ao excluir leilão.' });
  }
});

adminRoutes.get('/winners', async (_, res) => {
  try {
    const found = await pool.query(
      `SELECT
         a.id,
         a.title,
         a.ends_at AS "endsAt",
         a.winner_bid AS "winnerBid",
         u.id AS "winnerId",
         u.first_name AS "winnerFirstName",
         u.last_name AS "winnerLastName",
         u.cpf AS "winnerCpf"
       FROM leilao_auctions a
       LEFT JOIN leilao_users u ON u.id = a.winner_user_id
       WHERE a.status = 'closed'
       ORDER BY a.ends_at DESC`,
    );

    return res.json({ winners: found.rows });
  } catch {
    return res.status(500).json({ message: 'Erro ao listar vencedores.' });
  }
});

adminRoutes.get('/auctions/:auctionId/participants', async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT
         u.id,
         u.first_name AS "firstName",
         u.last_name AS "lastName",
         u.cpf,
         u.email,
         u.phone,
         COUNT(*)::int AS "bidsCount",
         MAX(b.amount) AS "maxBid",
         MAX(b.created_at) AS "lastBidAt"
       FROM leilao_bids b
       INNER JOIN leilao_users u ON u.id = b.user_id
       WHERE b.auction_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.cpf, u.email, u.phone
       ORDER BY "maxBid" DESC, "lastBidAt" ASC`,
      [req.params.auctionId],
    );

    return res.json({ participants: found.rows });
  } catch {
    return res.status(500).json({ message: 'Erro ao listar participantes.' });
  }
});

adminRoutes.get('/redemptions', async (_, res) => {
  try {
    const found = await pool.query(
      `SELECT
         r.id,
         r.auction_id AS "auctionId",
         r.user_id AS "userId",
         r.payment_method AS "paymentMethod",
         r.address_line AS "addressLine",
         r.address_number AS "addressNumber",
         r.district,
         r.city,
         r.state,
         r.zip_code AS "zipCode",
         r.complement,
         r.map_query AS "mapQuery",
         r.status,
         r.created_at AS "createdAt",
         a.title AS "auctionTitle",
         a.winner_bid AS "winnerBid",
         u.first_name AS "userFirstName",
         u.last_name AS "userLastName",
         u.cpf AS "userCpf",
         u.email AS "userEmail"
       FROM leilao_redemptions r
       INNER JOIN leilao_auctions a ON a.id = r.auction_id
       INNER JOIN leilao_users u ON u.id = r.user_id
       ORDER BY
         CASE r.status WHEN 'requested' THEN 1 WHEN 'confirmed' THEN 2 ELSE 3 END,
         r.created_at DESC`,
    );

    return res.json({
      redemptions: found.rows.map((row) => ({
        ...row,
        winnerBid: Number(row.winnerBid || 0),
      })),
    });
  } catch {
    return res.status(500).json({ message: 'Erro ao listar solicitações de resgate.' });
  }
});

adminRoutes.patch('/redemptions/:redemptionId/status', async (req, res) => {
  const parsed = updateRedemptionStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { status } = parsed.data;

  try {
    const current = await pool.query(
      `SELECT id, status
       FROM leilao_redemptions
       WHERE id = $1`,
      [req.params.redemptionId],
    );

    if (current.rowCount === 0) {
      return res.status(404).json({ message: 'Solicitação de resgate não encontrada.' });
    }

    const statusAtual = String(current.rows[0].status || '');

    if (status === 'confirmed' && statusAtual !== 'requested') {
      return res.status(400).json({ message: 'Só é possível liberar resgates solicitados.' });
    }

    const updated = await pool.query(
      `UPDATE leilao_redemptions
       SET status = $1
       WHERE id = $2
       RETURNING
         id,
         auction_id AS "auctionId",
         user_id AS "userId",
         payment_method AS "paymentMethod",
         address_line AS "addressLine",
         address_number AS "addressNumber",
         district,
         city,
         state,
         zip_code AS "zipCode",
         complement,
         map_query AS "mapQuery",
         status,
         created_at AS "createdAt"`,
      [status, req.params.redemptionId],
    );

    return res.json({ redemption: updated.rows[0] });
  } catch {
    return res.status(500).json({ message: 'Erro ao atualizar status do resgate.' });
  }
});

module.exports = { adminRoutes };
