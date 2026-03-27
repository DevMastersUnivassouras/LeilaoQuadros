const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function initDb() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  await pool.query(schemaSql);
}

module.exports = { initDb };
