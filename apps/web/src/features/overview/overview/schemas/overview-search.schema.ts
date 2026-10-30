import { z } from 'zod';

/** What the Visão geral keeps in the URL besides the month: the view of "Até o fim do mês". */
export const overviewSearchSchema = z.object({
  strip: z.enum(['day', 'week']).default('day').catch('day'),
});

export type OverviewSearch = z.infer<typeof overviewSearchSchema>;
