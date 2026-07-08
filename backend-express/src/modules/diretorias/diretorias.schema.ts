import { z } from 'zod';

export const directoriaSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const moveMemberSchema = z.object({
  userId: z.string().uuid(),
});

export const autoArchiveSchema = z.object({
  autoArchiveDays: z.number().int().min(0).max(365),
});

export type DirectoriaInput = z.infer<typeof directoriaSchema>;
