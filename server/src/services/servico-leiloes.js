const { pool } = require('../db/pool');

let intervaloLeiloes = null;
let executando = false;

async function sincronizarLeiloesPorHorario() {
  if (executando) {
    return;
  }

  executando = true;

  try {
    await pool.query(
      `UPDATE leilao_auctions
       SET status = 'active', updated_at = NOW()
       WHERE status = 'scheduled'
         AND starts_at <= NOW()
         AND ends_at > NOW()`,
    );

    await pool.query(
      `WITH ranked AS (
         SELECT
           b.auction_id,
           b.user_id,
           b.amount,
           ROW_NUMBER() OVER (PARTITION BY b.auction_id ORDER BY b.amount DESC, b.created_at ASC) AS rn
         FROM leilao_bids b
       ),
       winners AS (
         SELECT auction_id, user_id, amount
         FROM ranked
         WHERE rn = 1
       )
       UPDATE leilao_auctions a
       SET
         status = 'closed',
         winner_user_id = w.user_id,
         winner_bid = w.amount,
         current_bid = w.amount,
         updated_at = NOW()
       FROM winners w
       WHERE a.id = w.auction_id
         AND a.status IN ('scheduled', 'active')
         AND a.ends_at <= NOW()`,
    );

    await pool.query(
      `WITH settled AS (
         SELECT id AS auction_id, winner_user_id, winner_bid
         FROM leilao_auctions
         WHERE status = 'closed'
           AND winner_user_id IS NOT NULL
           AND winner_bid IS NOT NULL
           AND updated_at >= NOW() - INTERVAL '20 seconds'
       )
       UPDATE leilao_users u
       SET
         wallet_reserved = GREATEST(0, u.wallet_reserved - s.winner_bid),
         wallet_balance = GREATEST(0, u.wallet_balance - s.winner_bid),
         updated_at = NOW()
       FROM settled s
       WHERE u.id = s.winner_user_id`,
    );

    await pool.query(
      `WITH settled AS (
         SELECT id AS auction_id, winner_user_id, winner_bid, title
         FROM leilao_auctions
         WHERE status = 'closed'
           AND winner_user_id IS NOT NULL
           AND winner_bid IS NOT NULL
           AND updated_at >= NOW() - INTERVAL '20 seconds'
       )
       INSERT INTO leilao_wallet_transactions (user_id, auction_id, type, amount, description)
       SELECT
         s.winner_user_id,
         s.auction_id,
         'settlement',
         s.winner_bid,
         'Liquidacao simulada do leilao: ' || COALESCE(s.title, '')
       FROM settled s`,
    );

    await pool.query(
      `UPDATE leilao_auctions a
       SET status = 'closed', winner_user_id = NULL, winner_bid = NULL, updated_at = NOW()
       WHERE a.status IN ('scheduled', 'active')
         AND a.ends_at <= NOW()
         AND NOT EXISTS (
           SELECT 1
           FROM leilao_bids b
           WHERE b.auction_id = a.id
         )`,
    );
  } finally {
    executando = false;
  }
}

function iniciarAgendadorLeiloes() {
  if (intervaloLeiloes) {
    return;
  }

  sincronizarLeiloesPorHorario().catch(() => null);
  intervaloLeiloes = setInterval(() => {
    sincronizarLeiloesPorHorario().catch(() => null);
  }, 10000);
}

module.exports = {
  sincronizarLeiloesPorHorario,
  iniciarAgendadorLeiloes,
};
