import { z } from 'zod';

// An absolute Windows path: `C:\...` or `\\server\...`. A relative path is a validation error.
export const updateBackupSettingsRequestSchema = z.object({
  folderPath: z
    .string()
    .trim()
    .max(260)
    .regex(/^(?:[A-Za-z]:\\|\\\\[^\\]+\\)/),
});
