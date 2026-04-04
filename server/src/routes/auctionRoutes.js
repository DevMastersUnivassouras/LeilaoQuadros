const express = require('express');
const { z } = require('zod');

const { pool } = require('../db/pool');

const auctionRoutes = express.Router();

const bidSchema = z.object({
  amount: z.coerce.number().positive('Valor de lance inválido'),
});

const depositSchema = z.object({
  amount: z.coerce.number().positive('Valor de depósito inválido'),
  method: z.enum(['deposito_simulado']).optional().default('deposito_simulado'),
});

const redeemSchema = z.object({
  paymentMethod: z.enum(['pix_simulado', 'deposito_simulado']).optional().default('deposito_simulado'),
  addressQuery: z.string().trim().optional().default(''),
  addressLine: z.string().trim().optional().default(''),
  addressNumber: z.string().trim().optional().default(''),
  district: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  state: z.string().trim().optional().default(''),
  zipCode: z.string().trim().optional().default(''),
  complement: z.string().trim().optional().default(''),
  mapQuery: z.string().trim().optional().default(''),
});

function mapAuction(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    mediaUrl: row.media_url,
    startingBid: Number(row.starting_bid),
    currentBid: Number(row.current_bid),
    minIncrement: Number(row.min_increment),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    winnerUserId: row.winner_user_id,
    winnerBid: row.winner_bid != null ? Number(row.winner_bid) : null,
    participantsCount: Number(row.participants_count || 0),
    bidsCount: Number(row.bids_count || 0),
  };
}

auctionRoutes.get('/wallet', async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT wallet_balance AS "walletBalance", wallet_reserved AS "walletReserved"
       FROM leilao_users
       WHERE id = $1`,
      [req.user.sub],
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const txResult = await pool.query(
      `SELECT id, auction_id AS "auctionId", type, amount, method, description, created_at AS "createdAt"
       FROM leilao_wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.sub],
    );

    const walletBalance = Number(userResult.rows[0].walletBalance || 0);
    const walletReserved = Number(userResult.rows[0].walletReserved || 0);

    return res.json({
      wallet: {
        walletBalance,
        walletReserved,
        walletAvailable: Math.max(0, walletBalance - walletReserved),
      },
      transactions: txResult.rows.map((row) => ({
        ...row,
        amount: Number(row.amount || 0),
      })),
    });
  } catch {
    return res.status(500).json({ message: 'Erro ao buscar carteira.' });
  }
});

auctionRoutes.post('/wallet/deposit', async (req, res) => {
  const parsed = depositSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { amount, method } = parsed.data;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE leilao_users
       SET wallet_balance = wallet_balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING wallet_balance AS "walletBalance", wallet_reserved AS "walletReserved"`,
      [amount, req.user.sub],
    );

    await client.query(
      `INSERT INTO leilao_wallet_transactions (user_id, type, amount, method, description)
       VALUES ($1, 'deposit', $2, $3, 'Depósito simulado na carteira')`,
      [req.user.sub, amount, method],
    );

    await client.query('COMMIT');

    const walletBalance = Number(updated.rows[0].walletBalance || 0);
    const walletReserved = Number(updated.rows[0].walletReserved || 0);

    return res.status(201).json({
      wallet: {
        walletBalance,
        walletReserved,
        walletAvailable: Math.max(0, walletBalance - walletReserved),
      },
    });
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Erro ao adicionar saldo simulado.' });
  } finally {
    client.release();
  }
});

auctionRoutes.get('/wins', async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT
         a.id,
         a.title,
         a.description,
         a.media_url AS "mediaUrl",
         a.current_bid AS "currentBid",
         a.winner_bid AS "winnerBid",
         a.ends_at AS "endedAt",
         r.id AS "redemptionId",
         r.status AS "redemptionStatus",
         r.created_at AS "redemptionCreatedAt"
       FROM leilao_auctions a
       LEFT JOIN leilao_redemptions r ON r.auction_id = a.id AND r.user_id = $1
       WHERE a.status = 'closed'
         AND a.winner_user_id = $1
       ORDER BY a.ends_at DESC`,
      [req.user.sub],
    );

    return res.json({
      wins: found.rows.map((row) => ({
        ...row,
        currentBid: Number(row.currentBid || 0),
        winnerBid: Number(row.winnerBid || 0),
      })),
    });
  } catch {
    return res.status(500).json({ message: 'Erro ao listar leilões vencidos.' });
  }
});

auctionRoutes.post('/:auctionId/redeem', async (req, res) => {
  const parsed = redeemSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  const enderecoBase = String(data.addressQuery || '').trim();
  const enderecoLinha = String(data.addressLine || '').trim() || enderecoBase || 'Endereço não informado';
  const numero = String(data.addressNumber || '').trim() || 'S/N';
  const bairro = String(data.district || '').trim();
  const cidade = String(data.city || '').trim() || 'Não informado';
  const estado = String(data.state || '').trim() || 'NI';
  const cep = String(data.zipCode || '').trim() || '00000000';
  const complemento = String(data.complement || '').trim();
  const mapaConsulta = String(data.mapQuery || '').trim() || enderecoBase || `${enderecoLinha}, ${cidade}, ${estado}`;

  try {
    const winner = await pool.query(
      `SELECT id
       FROM leilao_auctions
       WHERE id = $1 AND status = 'closed' AND winner_user_id = $2`,
      [req.params.auctionId, req.user.sub],
    );

    if (winner.rowCount === 0) {
      return res.status(403).json({ message: 'Resgate permitido apenas para vencedor de leilão encerrado.' });
    }

    const created = await pool.query(
      `INSERT INTO leilao_redemptions (
         auction_id,
         user_id,
         payment_method,
         address_line,
         address_number,
         district,
         city,
         state,
         zip_code,
         complement,
         map_query,
         status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'requested')
       ON CONFLICT (auction_id)
       DO UPDATE SET
         payment_method = EXCLUDED.payment_method,
         address_line = EXCLUDED.address_line,
         address_number = EXCLUDED.address_number,
         district = EXCLUDED.district,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         zip_code = EXCLUDED.zip_code,
         complement = EXCLUDED.complement,
         map_query = EXCLUDED.map_query,
         status = 'requested'
       RETURNING
         id,
         auction_id AS "auctionId",
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
      [
        req.params.auctionId,
        req.user.sub,
        data.paymentMethod,
        enderecoLinha,
        numero,
        bairro || null,
        cidade,
        estado,
        cep,
        complemento || null,
        mapaConsulta,
      ],
    );

    return res.status(201).json({ redemption: created.rows[0] });
  } catch {
    return res.status(500).json({ message: 'Erro ao solicitar resgate do item.' });
  }
});

auctionRoutes.patch('/redemptions/:redemptionId/confirm-delivery', async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT id, user_id AS "userId", status
       FROM leilao_redemptions
       WHERE id = $1`,
      [req.params.redemptionId],
    );

    if (found.rowCount === 0) {
      return res.status(404).json({ message: 'Solicitação de resgate não encontrada.' });
    }

    const item = found.rows[0];

    if (String(item.userId) !== String(req.user.sub)) {
      return res.status(403).json({ message: 'Somente o usuário dono do resgate pode confirmar entrega.' });
    }

    if (String(item.status) !== 'confirmed') {
      return res.status(400).json({ message: 'A entrega só pode ser confirmada quando o item estiver em caminho.' });
    }

    const updated = await pool.query(
      `UPDATE leilao_redemptions
       SET status = 'delivered'
       WHERE id = $1
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
      [req.params.redemptionId],
    );

    return res.json({ redemption: updated.rows[0] });
  } catch {
    return res.status(500).json({ message: 'Erro ao confirmar recebimento do item.' });
  }
});

auctionRoutes.get('/', async (req, res) => {
  try {
    const status = String(req.query.status || 'active').trim();
    const nowOnly = String(req.query.nowOnly || 'true').trim().toLowerCase() !== 'false';

    const params = [status];
    let extraFilter = '';

    if (status === 'active' && nowOnly) {
      extraFilter = ' AND a.ends_at > NOW()';
    }

    const found = await pool.query(
      `SELECT
         a.*,
         COALESCE(m.participants_count, 0) AS participants_count,
         COALESCE(m.bids_count, 0) AS bids_count
       FROM leilao_auctions a
       LEFT JOIN (
         SELECT
           auction_id,
           COUNT(*)::int AS bids_count,
           COUNT(DISTINCT user_id)::int AS participants_count
         FROM leilao_bids
         GROUP BY auction_id
       ) m ON m.auction_id = a.id
       WHERE a.status = $1${extraFilter}
       ORDER BY a.ends_at ASC`,
      params,
    );

    return res.json({ auctions: found.rows.map(mapAuction) });
  } catch {
    return res.status(500).json({ message: 'Erro ao listar leilões.' });
  }
});

auctionRoutes.get('/:auctionId', async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT
         a.*,
         COALESCE(m.participants_count, 0) AS participants_count,
         COALESCE(m.bids_count, 0) AS bids_count
       FROM leilao_auctions a
       LEFT JOIN (
         SELECT
           auction_id,
           COUNT(*)::int AS bids_count,
           COUNT(DISTINCT user_id)::int AS participants_count
         FROM leilao_bids
         GROUP BY auction_id
       ) m ON m.auction_id = a.id
       WHERE a.id = $1`,
      [req.params.auctionId],
    );

    if (found.rowCount === 0) {
      return res.status(404).json({ message: 'Leilão não encontrado.' });
    }

    const bids = await pool.query(
      `SELECT
         b.id,
         b.amount,
         b.created_at AS "createdAt",
         u.id AS "userId",
         u.first_name AS "firstName",
         u.last_name AS "lastName"
       FROM leilao_bids b
       INNER JOIN leilao_users u ON u.id = b.user_id
       WHERE b.auction_id = $1
       ORDER BY b.created_at DESC
       LIMIT 30`,
      [req.params.auctionId],
    );

    return res.json({
      auction: mapAuction(found.rows[0]),
      recentBids: bids.rows.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        createdAt: row.createdAt,
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
      })),
    });
  } catch {
    return res.status(500).json({ message: 'Erro ao buscar leilão.' });
  }
});

auctionRoutes.post('/:auctionId/bids', async (req, res) => {
  const parsed = bidSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { amount } = parsed.data;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      `SELECT *
       FROM leilao_auctions
       WHERE id = $1
       FOR UPDATE`,
      [req.params.auctionId],
    );

    if (found.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Leilão não encontrado.' });
    }

    const auction = found.rows[0];
    const bidder = await client.query(
      `SELECT wallet_balance, wallet_reserved
       FROM leilao_users
       WHERE id = $1
       FOR UPDATE`,
      [req.user.sub],
    );

    if (bidder.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    const now = Date.now();
    const startsAt = new Date(auction.starts_at).getTime();
    const endsAt = new Date(auction.ends_at).getTime();

    if (auction.status === 'cancelled' || auction.status === 'closed' || now >= endsAt) {
      await client.query(
        `UPDATE leilao_auctions
         SET status = 'closed', updated_at = NOW()
         WHERE id = $1 AND status IN ('scheduled', 'active')`,
        [auction.id],
      );
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Leilão já encerrado.' });
    }

    if (now < startsAt) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Leilão ainda não iniciado.' });
    }

    const currentBid = Number(auction.current_bid);
    const minIncrement = Number(auction.min_increment);
    const minBidAccepted = Math.max(currentBid + minIncrement, Number(auction.starting_bid));

    if (amount < minBidAccepted) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Lance precisa ser pelo menos ${minBidAccepted.toFixed(2)}.`,
      });
    }

    const previousHighestBidderId = auction.highest_bidder_user_id;
    const previousHighestAmount = previousHighestBidderId ? Number(auction.current_bid || 0) : 0;
    const bidderBalance = Number(bidder.rows[0].wallet_balance || 0);
    const bidderReserved = Number(bidder.rows[0].wallet_reserved || 0);
    const bidderAvailable = bidderBalance - bidderReserved;

    if (previousHighestBidderId === req.user.sub) {
      const additionalReserve = amount - previousHighestAmount;

      if (additionalReserve > 0 && bidderAvailable < additionalReserve) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Saldo simulado insuficiente para elevar o próprio lance.' });
      }

      if (additionalReserve > 0) {
        await client.query(
          `UPDATE leilao_users
           SET wallet_reserved = wallet_reserved + $1, updated_at = NOW()
           WHERE id = $2`,
          [additionalReserve, req.user.sub],
        );

        await client.query(
          `INSERT INTO leilao_wallet_transactions (user_id, auction_id, type, amount, description)
           VALUES ($1, $2, 'reserve', $3, 'Reserva simulada para aumentar lance')`,
          [req.user.sub, auction.id, additionalReserve],
        );
      }
    } else {
      if (bidderAvailable < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Saldo simulado insuficiente para este lance.' });
      }

      await client.query(
        `UPDATE leilao_users
         SET wallet_reserved = wallet_reserved + $1, updated_at = NOW()
         WHERE id = $2`,
        [amount, req.user.sub],
      );

      await client.query(
        `INSERT INTO leilao_wallet_transactions (user_id, auction_id, type, amount, description)
         VALUES ($1, $2, 'reserve', $3, 'Reserva simulada para participar do leilão')`,
        [req.user.sub, auction.id, amount],
      );

      if (previousHighestBidderId) {
        await client.query(
          `UPDATE leilao_users
           SET wallet_reserved = GREATEST(0, wallet_reserved - $1), updated_at = NOW()
           WHERE id = $2`,
          [previousHighestAmount, previousHighestBidderId],
        );

        await client.query(
          `INSERT INTO leilao_wallet_transactions (user_id, auction_id, type, amount, description)
           VALUES ($1, $2, 'release', $3, 'Liberação de reserva após ser ultrapassado')`,
          [previousHighestBidderId, auction.id, previousHighestAmount],
        );
      }
    }

    await client.query(
      `INSERT INTO leilao_bids (auction_id, user_id, amount)
       VALUES ($1, $2, $3)`,
      [auction.id, req.user.sub, amount],
    );

    const updated = await client.query(
      `UPDATE leilao_auctions
       SET current_bid = $1, status = 'active', highest_bidder_user_id = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [amount, req.user.sub, auction.id],
    );

    const metrics = await client.query(
      `SELECT
         COUNT(*)::int AS bids_count,
         COUNT(DISTINCT user_id)::int AS participants_count
       FROM leilao_bids
       WHERE auction_id = $1`,
      [auction.id],
    );

    await client.query('COMMIT');

    const row = {
      ...updated.rows[0],
      bids_count: metrics.rows[0].bids_count,
      participants_count: metrics.rows[0].participants_count,
    };

    return res.status(201).json({ auction: mapAuction(row) });
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Erro ao enviar lance.' });
  } finally {
    client.release();
  }
});

module.exports = { auctionRoutes };
