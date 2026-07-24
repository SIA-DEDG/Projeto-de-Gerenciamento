import { z } from 'zod';

export const updatePermissionPresetSchema = z.object({
  role: z.string(),
  permissions: z.record(z.string(), z.boolean()),
});