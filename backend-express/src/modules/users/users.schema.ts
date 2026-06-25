import { z } from 'zod';

export const updateNameSchema = z.object({
  name: z.string(),
});

export const updateRoleSchema = z.object({
  role: z.string(),
});

export const resetPasswordSchema = z.object({
  new_password: z.string().min(6),
});
