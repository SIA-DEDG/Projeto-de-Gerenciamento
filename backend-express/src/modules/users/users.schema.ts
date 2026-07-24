import { z } from 'zod';

export const updateNameSchema = z.object({
  name: z.string(),
});

export const updateRoleSchema = z.object({
  role: z.string(),
});

export const updateAccessSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  directoriaId: z.string().optional().nullable(),
  role: z.string(),
  permissions: z.record(z.string(), z.boolean()),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
});