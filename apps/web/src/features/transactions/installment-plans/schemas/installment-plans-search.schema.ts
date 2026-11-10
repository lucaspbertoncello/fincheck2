import { z } from 'zod';

/** An optional id param; a malformed value is read as absent. */
const idParam = z.string().min(1).max(100).optional().catch(undefined);

/**
 * Search params of "Compras parceladas": which modal or dialog is open lives in the URL.
 * `new=installment` opens the form to launch a purchase on this card; `edit` and `remove` carry the id
 * of the plan being edited or deleted.
 */
export const installmentPlansSearchSchema = z.object({
  new: z.literal('installment').optional().catch(undefined),
  edit: idParam,
  remove: idParam,
});
