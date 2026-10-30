import type { z } from 'zod';

import type {
  createTransactionRequestSchema,
  listTransactionsQuerySchema,
  listTransactionsResponseSchema,
  resolveBankChangeRequestSchema,
  splitTransactionRequestSchema,
  transactionBankChangeDtoSchema,
  transactionBankDtoSchema,
  transactionCategorySourceSchema,
  transactionDtoSchema,
  transactionInstallmentDtoSchema,
  transactionLinksDtoSchema,
  transactionMethodSchema,
  transactionNatureSchema,
  transactionOriginSchema,
  transactionSplitDtoSchema,
  updateTransactionRequestSchema,
} from './transaction.schema.ts';

export namespace Transaction {
  export type Dto = z.infer<typeof transactionDtoSchema>;
  export type Origin = z.infer<typeof transactionOriginSchema>;
  export type Method = z.infer<typeof transactionMethodSchema>;
  export type Nature = z.infer<typeof transactionNatureSchema>;
  export type CategorySource = z.infer<typeof transactionCategorySourceSchema>;
  export type SplitDto = z.infer<typeof transactionSplitDtoSchema>;
  export type BankDto = z.infer<typeof transactionBankDtoSchema>;
  export type BankChangeDto = z.infer<typeof transactionBankChangeDtoSchema>;
  export type InstallmentDto = z.infer<typeof transactionInstallmentDtoSchema>;
  export type LinksDto = z.infer<typeof transactionLinksDtoSchema>;
  export type CreateRequest = z.infer<typeof createTransactionRequestSchema>;
  export type UpdateRequest = z.infer<typeof updateTransactionRequestSchema>;
  export type ListQuery = z.infer<typeof listTransactionsQuerySchema>;
  export type ListResponse = z.infer<typeof listTransactionsResponseSchema>;
  export type SplitRequest = z.infer<typeof splitTransactionRequestSchema>;
  export type ResolveBankChangeRequest = z.infer<typeof resolveBankChangeRequestSchema>;
}
