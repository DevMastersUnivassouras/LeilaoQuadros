const { pool } = require('../db/pool');

async function adminMiddleware(req, res, next) {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Token inválido.' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const found = await pool.query('SELECT user_role FROM leilao_users WHERE id = $1', [req.user.sub]);

    if (found.rowCount === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    if (found.rows[0].user_role !== 'admin') {
      return res.status(403).json({ message: 'Acesso restrito ao administrador.' });
    }

    req.user.role = 'admin';
    return next();
  } catch {
    return res.status(500).json({ message: 'Erro ao validar permissões de administrador.' });
  }
}

module.exports = { adminMiddleware };
