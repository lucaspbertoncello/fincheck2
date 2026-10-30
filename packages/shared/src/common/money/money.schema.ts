import { z } from 'zod';

// Money is always an integer number of cents. The name of a money field ends with `Cents`.
export const centsSchema = z.int();
export const positiveCentsSchema = z.int().positive();
export const nonNegativeCentsSchema = z.int().nonnegative();
