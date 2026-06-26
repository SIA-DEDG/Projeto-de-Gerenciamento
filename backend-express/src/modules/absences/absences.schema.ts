import { z } from 'zod';

export const absenceSchema = z.object({
  reason: z.string(),
  justification: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  filePath: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
});

export const approvalSchema = z.object({
  approvalStatus: z.enum(['aprovada', 'recusada', 'pendente']),
});

export type AbsenceInput = z.infer<typeof absenceSchema>;
