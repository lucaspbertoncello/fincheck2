import { z } from 'zod';

// Every id in the API is a UUID (v7 in the real API).
export const idSchema = z.uuid();
