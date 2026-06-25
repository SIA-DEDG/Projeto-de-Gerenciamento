import { z } from 'zod';

export const eventSchema = z.object({
  name: z.string(),
  eventType: z.string(),
  attendees: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  startTime: z.string().optional().nullable(),
  responsibleIds: z.array(z.string().uuid()).optional(),
});

export const setMinutesSchema = z.object({
  fileName: z.string(),
  fileData: z.string(), // base64 — backend faz upload pro Supabase
});

export type EventInput = z.infer<typeof eventSchema>;
