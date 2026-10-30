import { z } from 'zod';

// A boolean in a query string is the text `true` or `false`.
export const queryBooleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');
