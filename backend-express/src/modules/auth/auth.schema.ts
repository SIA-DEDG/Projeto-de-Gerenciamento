import { z } from 'zod';

// NOTA: o middleware camelCaseRequest converte snake_case → camelCase antes do Zod.
// Então os campos devem ser camelCase aqui.

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const registerSchema = z.object({
  username: z.string(),
  name: z.string(),
  role: z.string().optional(),
  directoriaId: z.string().optional().nullable(), // UUID validado pelo banco
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

export const setInitialPasswordSchema = z.object({
  newPassword: z.string().min(6),
});
