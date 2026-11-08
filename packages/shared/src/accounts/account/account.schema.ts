import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';
import { queryBooleanSchema } from '../../common/query/query.schema.ts';
import {
  connectionErrorCodeSchema,
  connectionStatusSchema,
} from '../../sync/connection/connection.schema.ts';
import {
  createCreditCardRequestSchema,
  creditCardDtoSchema,
  updateCreditCardRequestSchema,
} from '../credit-card/credit-card.schema.ts';
import { institutionCodeSchema } from '../institution/institution.schema.ts';
import { ACCOUNT_SOURCES, ACCOUNT_TYPES } from './account.constant.ts';

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
export const accountSourceSchema = z.enum(ACCOUNT_SOURCES);

export const accountConnectionDtoSchema = z.object({
  connectionId: idSchema,
  status: connectionStatusSchema,
  errorCode: connectionErrorCodeSchema.nullable(),
  lastBankUpdateAt: instantSchema.nullable(),
});

export const accountDtoSchema = z.object({
  id: idSchema,
  type: accountTypeSchema,
  source: accountSourceSchema,
  name: z.string().min(1).max(60),
  institutionCode: institutionCodeSchema,
  institutionName: z.string().nullable(),
  balanceCents: centsSchema.nullable(),
  balanceAt: instantSchema.nullable(),
  connection: accountConnectionDtoSchema.nullable(),
  creditCard: creditCardDtoSchema.nullable(),
  archivedAt: instantSchema.nullable(),
  createdAt: instantSchema,
});

export const listAccountsQuerySchema = z.object({
  includeArchived: queryBooleanSchema.default(false),
});

const accountNameSchema = z.string().trim().min(1).max(60);

export const createAccountRequestSchema = z
  .object({
    type: accountTypeSchema,
    name: accountNameSchema,
    institutionCode: institutionCodeSchema.optional(),
    institutionName: z.string().trim().min(1).max(60).optional(),
    initialBalanceCents: centsSchema.optional(),
    creditCard: createCreditCardRequestSchema.optional(),
  })
  .superRefine((value, context) => {
    const fail = (path: string, message: string) =>
      context.addIssue({ code: 'custom', path: [path], message });

    if (value.type === 'credit_card') {
      if (!value.creditCard) fail('creditCard', 'A credit card needs its card data');
      if (value.initialBalanceCents !== undefined) {
        fail('initialBalanceCents', 'A credit card has no initial balance');
      }
    } else if (value.creditCard) {
      fail('creditCard', 'Only a credit card has card data');
    }

    if (value.type === 'wallet') {
      if (value.institutionName !== undefined) {
        fail('institutionName', 'A wallet has no institution name');
      }
      return;
    }

    if (!value.institutionCode) fail('institutionCode', 'Choose the institution');
    if (value.institutionCode === 'wallet') {
      fail('institutionCode', 'Only a wallet uses the wallet institution');
    }
    if (value.institutionCode === 'other' && !value.institutionName) {
      fail('institutionName', 'Name the institution');
    }
    if (value.institutionCode !== 'other' && value.institutionName !== undefined) {
      fail('institutionName', 'Only the institution "other" has a name');
    }
  });

export const updateAccountRequestSchema = z
  .strictObject({
    name: accountNameSchema.optional(),
    institutionCode: institutionCodeSchema.optional(),
    institutionName: z.string().trim().min(1).max(60).nullable().optional(),
    creditCard: updateCreditCardRequestSchema.optional(),
  })
  // Any top-level field that is defined counts, a new one included; only an empty `creditCard` ({})
  // changes nothing, so it counts as a missing field.
  .refine(
    (value) => {
      const { creditCard, ...topLevel } = value;
      const changesCard =
        creditCard !== undefined && Object.values(creditCard).some((field) => field !== undefined);

      return changesCard || Object.values(topLevel).some((field) => field !== undefined);
    },
    { message: 'Send at least one field' },
  );
