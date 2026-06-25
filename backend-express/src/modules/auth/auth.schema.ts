import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const registerSchema = z.object({
  username: z.string(),
  name: z.string(),
  role: z.string().optional(),
  directoria_id: z.string().uuid().optional().nullable(),
});

export const changePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(6),
});

export const setInitialPasswordSchema = z.object({
  new_password: z.string().min(6),
});
