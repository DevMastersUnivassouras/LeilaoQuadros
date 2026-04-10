const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { authMiddleware } = require('../src/middleware/authMiddleware');

function createMockRes() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
}

test('authMiddleware retorna 401 quando token nao informado', () => {
  process.env.JWT_SECRET = 'jwt_secret_teste';
  const req = { headers: {} };
  const res = createMockRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.payload, { message: 'Token não informado.' });
});

test('authMiddleware retorna 401 quando token invalido', () => {
  process.env.JWT_SECRET = 'jwt_secret_teste';
  const req = { headers: { authorization: 'Bearer token_invalido_mock' } };
  const res = createMockRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.payload, { message: 'Token inválido.' });
});

test('authMiddleware injeta req.user e chama next com token valido', () => {
  process.env.JWT_SECRET = 'jwt_secret_teste';
  const token = jwt.sign({ sub: 10, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createMockRes();
  let nextCalled = false;

  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.sub, 10);
  assert.equal(req.user.role, 'user');
});
