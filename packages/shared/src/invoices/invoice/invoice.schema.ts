import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import {
  centsSchema,
  nonNegativeCentsSchema,
  positiveCentsSchema,
} from '../../common/money/money.schema.ts';
import { invoicePaymentDtoSchema } from '../invoice-payment/invoice-payment.schema.ts';
import { INVOICE_STATUSES } from './invoice.constant.ts';

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);

export const invoiceBreakdownSchema = z.object({
  purchasesCents: centsSchema,
  installmentsCents: centsSchema,
  expectedRecurringCents: centsSchema,
});

export const invoicePaymentSuggestionSchema = z.object({
  transactionId: idSchema,
  accountId: idSchema,
  amountCents: z.int().negative(),
  occurredOn: businessDateSchema,
  description: z.string(),
  isPresumed: z.boolean(),
});

export const invoiceDtoSchema = z.object({
  accountId: idSchema,
  month: monthSchema,
  closesOn: businessDateSchema,
  dueOn: businessDateSchema,
  status: invoiceStatusSchema,
  breakdown: invoiceBreakdownSchema,
  computedTotalCents: centsSchema,
  bankTotalCents: nonNegativeCentsSchema.nullable(),
  totalOverrideCents: nonNegativeCentsSchema.nullable(),
  overrideNote: z.string().max(200).nullable(),
  totalCents: centsSchema,
  paidCents: nonNegativeCentsSchema,
  presumedPaidCents: nonNegativeCentsSchema,
  remainingCents: nonNegativeCentsSchema,
  payments: z.array(invoicePaymentDtoSchema),
  paymentSuggestion: invoicePaymentSuggestionSchema.nullable(),
  isEditable: z.boolean(),
  // Due before the first round of the Pluggy connection, with no payment (a correction of the total does not matter): paid
  // before the Fincheck existed, so it is not a debt (status `paid`, nothing left to pay).
  paidBeforeFincheck: z.boolean().default(false),
});

export const invoiceItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('transaction'),
    transactionId: idSchema,
    description: z.string(),
    occurredOn: businessDateSchema,
    amountCents: centsSchema,
    categoryId: idSchema.nullable(),
    installment: z.object({ number: z.int().min(1), count: z.int().min(2) }).nullable(),
  }),
  z.object({
    type: z.literal('expected_recurrence'),
    occurrenceId: idSchema,
    recurrenceName: z.string(),
    expectedOn: businessDateSchema.nullable(),
    amountCents: positiveCentsSchema,
  }),
]);

// Where the money of the invoice went: one entry per category (null: no category), expenses only,
// refunds taken off, biggest first (BR-INV-006).
// `isLent` marks the line "Emprestado" (what was lent to a friend), which has no category either:
// it tells it apart from the purchases with no category. It defaults to false.
export const invoiceCategoryShareSchema = z.object({
  categoryId: idSchema.nullable(),
  isLent: z.boolean().default(false),
  totalCents: positiveCentsSchema,
  sharePercent: z.number().min(0).max(100),
  itemCount: z.int().min(1),
});

export const invoiceHighlightsSchema = z.object({
  largestItem: z
    .object({ transactionId: idSchema, title: z.string(), cents: positiveCentsSchema })
    .nullable(),
  // Installments whose last part is on this invoice (`number` = `total`).
  endingInstallments: z.array(
    z.object({
      transactionId: idSchema,
      title: z.string(),
      cents: positiveCentsSchema,
      number: z.int().min(2),
      total: z.int().min(2),
    }),
  ),
});

export const invoiceDetailDtoSchema = invoiceDtoSchema.extend({
  items: z.array(invoiceItemSchema),
  categoryBreakdown: z.array(invoiceCategoryShareSchema),
  // The total of the invoice of the month before, same card; null when there is none.
  previousTotalCents: centsSchema.nullable(),
  highlights: invoiceHighlightsSchema,
  // Installments and card recurrences already foreseen for the next invoice.
  nextInvoiceCommittedCents: nonNegativeCentsSchema,
});

export const openInvoiceItemSchema = z.object({ accountId: idSchema, invoice: invoiceDtoSchema });

export const invoiceParamsSchema = z.object({ accountId: idSchema, month: monthSchema });

function monthIndex(month: string): number {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7));
}

export const listInvoicesQuerySchema = z
  .object({ from: monthSchema.optional(), to: monthSchema.optional() })
  .superRefine((value, context) => {
    if (!value.from || !value.to) return;
    const distance = monthIndex(value.to) - monthIndex(value.from);
    if (distance < 0) {
      context.addIssue({ code: 'custom', path: ['from'], message: 'from must not be after to' });
    } else if (distance > 24) {
      context.addIssue({ code: 'custom', path: ['to'], message: 'At most 24 months apart' });
    }
  });

export const updateInvoiceRequestSchema = z
  .object({
    totalOverrideCents: nonNegativeCentsSchema.nullable().optional(),
    overrideNote: z.string().max(200).nullable().optional(),
  })
  .refine((value) => value.totalOverrideCents !== undefined || value.overrideNote !== undefined, {
    message: 'Send at least one field',
  });
