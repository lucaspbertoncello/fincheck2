import { z } from 'zod';

// The URL parser turns "123" into a number; a name must stay text.
const textSchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().min(1).max(100))
  .optional()
  .catch(undefined);

/**
 * What the Amigos tab keeps in the URL besides what the debt modals read (`new`, `friend`, `debt`,
 * `pay`): `?person=<name>` opens that person (the "A receber de amigos" card links to it). A name
 * nobody has is ignored.
 */
export const friendListSearchSchema = z.object({
  person: textSchema,
});
