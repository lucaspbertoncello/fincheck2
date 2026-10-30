import { z } from 'zod';

import { idSchema } from '../id/id.schema.ts';

// "Não é este" on a found payment, for invoices and bills alike.
export const dismissPaymentSuggestionRequestSchema = z.object({ transactionId: idSchema });
