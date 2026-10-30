import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema, nonNegativeCentsSchema } from '../../common/money/money.schema.ts';

// Tells the front which route to call on "Registrar pagamento"; only the fields of the type are filled.
export const agendaSourceSchema = z.object({
  type: z.enum(['bill', 'invoice', 'occurrence']),
  billId: idSchema.nullable(),
  occurrenceId: idSchema.nullable(),
  recurrenceId: idSchema.nullable(),
  accountId: idSchema.nullable(),
  month: monthSchema.nullable(),
});

export const agendaItemDtoSchema = z.object({
  key: z.string(),
  source: agendaSourceSchema,
  flow: z.enum(['in', 'out']),
  title: z.string(),
  badge: z.enum(['recurring', 'invoice', 'debt', 'bill', 'friend_receivable']),
  counterparty: z.string().nullable(),
  accountId: idSchema.nullable(),
  categoryId: idSchema.nullable(),
  dueOn: businessDateSchema.nullable(),
  amountCents: centsSchema,
  paidCents: nonNegativeCentsSchema,
  presumedPaidCents: nonNegativeCentsSchema,
  presumedTransactionId: idSchema.nullable(),
  remainingCents: nonNegativeCentsSchema,
  state: z.enum(['upcoming', 'partial', 'overdue', 'settled']),
  invoiceState: z.enum(['open', 'closed']).nullable(),
  settledOn: businessDateSchema.nullable(),
  countsInFreeBalance: z.boolean(),
  paymentFound: z
    .object({
      transactionId: idSchema,
      accountId: idSchema,
      amountCents: centsSchema,
      occurredOn: businessDateSchema,
      // The bank text of the payment ("PIX BRADESCO CARTOES"). Optional only until the API sends it.
      description: z.string().optional(),
    })
    .nullable(),
});

const itemsWithTotalSchema = z.object({
  totalCents: centsSchema,
  items: z.array(agendaItemDtoSchema),
});

export const agendaDtoSchema = z.object({
  month: monthSchema,
  payable: itemsWithTotalSchema.extend({ count: z.int().nonnegative() }),
  friendsReceivable: z.object({ totalCents: centsSchema, peopleCount: z.int().nonnegative() }),
  thisMonth: z.array(agendaItemDtoSchema),
  openInvoices: z.array(agendaItemDtoSchema),
  receivable: z.array(agendaItemDtoSchema),
  undated: z.array(agendaItemDtoSchema),
  settled: z.array(agendaItemDtoSchema),
});

export const getAgendaQuerySchema = z.object({ month: monthSchema });
