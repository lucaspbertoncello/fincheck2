import { z } from 'zod';

export const env = z
  .object({
    API_PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_FILE: z.string().min(1).default('data/fincheck.db'),
    // Optional. Without it the API reads (or creates) the `local-token` file in the data folder.
    LOCAL_TOKEN: z.string().min(16).optional(),
  })
  .parse(process.env);
