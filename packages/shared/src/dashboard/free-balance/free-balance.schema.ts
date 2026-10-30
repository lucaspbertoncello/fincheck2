import { z } from 'zod';

import { institutionCodeSchema } from '../../accounts/institution/institution.schema.ts';
import { accountSourceSchema } from '../../accounts/account/account.schema.ts';
import { businessDateSchema, instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';
import { connectionStatusSchema } from '../../sync/connection/connection.schema.ts';
import { agendaItemDtoSchema } from '../agenda/agenda.schema.ts';

const itemsWithTotalSchema = z.object({
  totalCents: centsSchema,
  items: z.array(agendaItemDtoSchema),
});

export const freeBalanceDtoSchema = z.object({
  asOfOn: businessDateSchema,
  daysRemaining: z.int().min(1),
  freeBalanceCents: centsSchema,
  isPartial: z.boolean(),
  accountsWithoutBalance: z.array(idSchema),
  perDayCents: centsSchema,
  accounts: z.object({
    totalCents: centsSchema,
    items: z.array(
      z.object({
        accountId: idSchema,
        name: z.string(),
        institutionCode: institutionCodeSchema,
        source: accountSourceSchema,
        balanceCents: centsSchema,
      }),
    ),
  }),
  receivable: itemsWithTotalSchema,
  payable: itemsWithTotalSchema,
  dataFreshness: z.array(
    z.object({
      connectionId: idSchema,
      institutionName: z.string(),
      status: connectionStatusSchema,
      lastBankUpdateAt: instantSchema.nullable(),
      isStale: z.boolean(),
    }),
  ),
  review: z.object({
    count: z.int().nonnegative(),
    byAccount: z.array(z.object({ accountId: idSchema, count: z.int().positive() })),
  }),
});
