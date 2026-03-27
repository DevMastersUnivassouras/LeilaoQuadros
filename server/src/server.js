require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');

const { initDb } = require('./db/initDb');
const { authRoutes } = require('./routes/authRoutes');
const { obterModoStorageAtual } = require('./services/servico-armazenamento');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

const port = Number(process.env.PORT || 3333);

initDb()
  .then(() => {
    console.log(`Storage ativo: ${obterModoStorageAtual()}`);
    app.listen(port, () => {
      console.log(`API de auth rodando na porta ${port}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao iniciar banco:', error);
    process.exit(1);
  });
