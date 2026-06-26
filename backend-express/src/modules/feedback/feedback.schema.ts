import { z } from 'zod';

export const feedbackSchema = z.object({
  tipo: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  severidade: z.string().optional().nullable(),
  imagens: z.array(z.string()).optional(),
});

export const setStatusSchema = z.object({
  status: z.string(),
});

export const setRespostaSchema = z.object({
  resposta: z.string(),
});

export const commentSchema = z.object({
  conteudo: z.string(),
  parent_id: z.string().uuid().optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
