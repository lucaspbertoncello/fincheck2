import { z } from 'zod';

/** Search params of Perfil: `edit=profile` opens "Editar perfil" (so a link or the capture script can open it). */
export const profileSearchSchema = z.object({
  edit: z.literal('profile').optional().catch(undefined),
});

export type ProfileSearch = z.infer<typeof profileSearchSchema>;
