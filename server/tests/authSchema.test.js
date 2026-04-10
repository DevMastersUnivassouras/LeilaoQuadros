const test = require('node:test');
const assert = require('node:assert/strict');

const {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  updateProfileSchema,
} = require('../src/schemas/authSchema');

test('registerSchema normaliza cpf e email', () => {
  const parsed = registerSchema.parse({
    cpf: '123.456.789-00',
    email: 'CONTA@EXAMPLE.COM ',
    phone: '11988887777',
    firstName: 'Usuario',
    lastName: 'Teste',
    password: 'senha123',
    passwordConfirmation: 'senha123',
  });

  assert.equal(parsed.cpf, '12345678900');
  assert.equal(parsed.email, 'conta@example.com');
  assert.equal(parsed.biometricEnabled, false);
});

test('registerSchema rejeita senha e confirmacao diferentes', () => {
  assert.throws(() => {
    registerSchema.parse({
      cpf: '12345678900',
      email: 'usuario@example.com',
      phone: '11988887777',
      firstName: 'Usuario',
      lastName: 'Teste',
      password: 'senha123',
      passwordConfirmation: 'senha321',
    });
  });
});

test('loginSchema valida cpf com 11 digitos', () => {
  const parsed = loginSchema.parse({ cpf: '123.456.789-00', password: 'senha123' });
  assert.equal(parsed.cpf, '12345678900');

  assert.throws(() => {
    loginSchema.parse({ cpf: '123', password: 'senha123' });
  });
});

test('adminLoginSchema exige adminId e senha minima', () => {
  const parsed = adminLoginSchema.parse({ adminId: 'admin_teste', password: 'senha123' });
  assert.equal(parsed.adminId, 'admin_teste');

  assert.throws(() => {
    adminLoginSchema.parse({ adminId: '', password: '123' });
  });
});

test('updateProfileSchema normaliza email', () => {
  const parsed = updateProfileSchema.parse({
    firstName: 'Usuario',
    lastName: 'Padrao',
    email: 'CONTATO@EXAMPLE.COM',
    phone: '11988887777',
  });

  assert.equal(parsed.email, 'contato@example.com');
});
