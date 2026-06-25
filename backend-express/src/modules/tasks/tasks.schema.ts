import { z } from 'zod';

export const taskSchema = z.object({
  category: z.string(),
  activity: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  responsibleId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  externalCollaborators: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  coResponsibleIds: z.array(z.string().uuid()).optional().nullable(),
});

export const taskBatchSchema = z.array(taskSchema);

export type TaskInput = z.infer<typeof taskSchema>;
