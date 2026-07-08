import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string(),
  category: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  executiveStatus: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  // Responsável do projeto (owner). No create, se omitido, é o criador; pode ser
  // reatribuído a outro usuário (dono atual ou Admin/Diretor).
  ownerId: z.string().uuid().optional().nullable(),
  // Lista de colaboradores. Só o responsável (ou Admin/Diretor) pode alterar; no create,
  // se omitida, o serviço usa todos os membros da diretoria.
  responsibleIds: z.array(z.string().uuid()).optional().nullable(),
});

export type ProjectInput = z.infer<typeof projectSchema>;
