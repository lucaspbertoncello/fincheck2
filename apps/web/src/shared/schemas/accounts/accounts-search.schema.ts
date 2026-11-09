import { z } from 'zod';

/** An optional text param; a malformed value is read as absent. */
const textParam = z.string().min(1).max(100).optional().catch(undefined);

/**
 * Search params of Contas e cartões: which modal, dialog or section is open lives in the URL.
 * `new=account` opens "Conectar conta" (the general "+" links here); `new=card` opens the same dialog
 * already on the manual form of a credit card ("Adicionar cartão de crédito"); the others carry the account
 * id and, where an invoice is meant, the closing month as `<accountId>:<YYYY-MM>` ("Corrigir valor";
 * "Ver fatura" is the page `/cards/:id/invoices/:month`).
 */
export const accountsSearchSchema = z.object({
  new: z.enum(['account', 'card']).optional().catch(undefined),
  /** Card id: shows its future invoices in place of the cards. */
  future: textParam,
  /** `<cardId>:<YYYY-MM>`: "Corrigir valor". */
  correct: textParam,
  /** Account id: "Ajustar saldo" or "Atualizar saldo". */
  adjust: textParam,
  /** Account id: "Editar conta" or "Editar cartão" (the modal that connects, filled). */
  edit: textParam,
  /** Account id: the delete confirmation. */
  remove: textParam,
});

export type AccountsSearch = z.infer<typeof accountsSearchSchema>;
