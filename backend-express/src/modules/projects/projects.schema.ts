import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string(),
  category: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  deadline: z.string().optional().nullable(),
  executiveStatus: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
});

export type ProjectInput = z.infer<typeof projectSchema>;
