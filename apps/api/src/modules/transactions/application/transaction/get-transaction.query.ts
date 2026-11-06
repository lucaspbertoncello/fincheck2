import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';

// The detail of one transaction (`GET /transactions/:id`).
export class GetTransactionQuery {
  private readonly builder: TransactionDtoBuilder;

  constructor(builder: TransactionDtoBuilder) {
    this.builder = builder;
  }

  async execute(input: GetTransactionQuery.Input): Promise<GetTransactionQuery.Output> {
    return this.builder.buildOne(input.id);
  }
}

export namespace GetTransactionQuery {
  export type Input = { id: string };
  export type Output = TransactionContract.Dto;
}
