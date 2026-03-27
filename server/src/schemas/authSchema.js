const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Email inválido').transform((value) => value.trim().toLowerCase()),
  firstName: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().trim().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  biometricEnabled: z.boolean().optional().default(false),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'Nome é obrigatório'),
  lastName: z.string().trim().min(1, 'Sobrenome é obrigatório'),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
};
