import { z } from 'zod';

export const env = z
  .object({
    API_PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_FILE: z.string().min(1).default('data/fincheck.db'),
  })
  .parse(process.env);
