import { z } from 'zod';

import { idSchema } from '../id/id.schema.ts';

// "Não é este" on a found payment, for invoices and bills alike.
export const dismissPaymentSuggestionRequestSchema = z.object({ transactionId: idSchema });

// The undo (`DELETE`) has no body: the transaction goes in the query, `?transactionId=`.
export const dismissPaymentSuggestionQuerySchema = z.object({ transactionId: idSchema });
