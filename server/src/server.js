require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');

const { initDb } = require('./db/initDb');
const { authRoutes } = require('./routes/authRoutes');
const { auctionRoutes } = require('./routes/auctionRoutes');
const { adminRoutes } = require('./routes/adminRoutes');
const { authMiddleware } = require('./middleware/authMiddleware');
const { adminMiddleware } = require('./middleware/adminMiddleware');
const { iniciarAgendadorLeiloes } = require('./services/servico-leiloes');
const { obterModoStorageAtual } = require('./services/servico-armazenamento');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/auctions', authMiddleware, auctionRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);

const port = Number(process.env.PORT || 3333);

initDb()
  .then(() => {
    iniciarAgendadorLeiloes();
    console.log(`Storage ativo: ${obterModoStorageAtual()}`);
    app.listen(port, () => {
      console.log(`API rodando na porta ${port}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao iniciar banco:', error);
    process.exit(1);
  });
