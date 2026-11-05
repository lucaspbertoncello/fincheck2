import type { ReactNode } from 'react';

import { Chip } from '#/components/chips/index.ts';
import { Money } from '#/components/money/index.ts';
import type { TransactionRowData } from '#/components/transactions/row/transaction-row.type.ts';

/** One piece of metadata of a row: the chip it becomes and the plain text it turns into when the chips are over. */
type TransactionRowFlag = {
  key: string;
  chip: ReactNode;
  /** What the detail line writes when the chips are over. */
  node: ReactNode;
  /** Plain text of `node` for the `title`; absent when it carries money, so a hidden value never leaks. */
  text?: string;
};

/**
 * Everything worth flagging on a transaction, in priority order (what asks for attention first,
 * then what happened to it, then what describes it). The row shows the first two as chips and
 * writes the rest on the detail line, so a row never carries a third chip (components.md 10.0).
 */
export function buildTransactionRowFlags(transaction: TransactionRowData): TransactionRowFlag[] {
  const { installment, splitParts, debtPaidCents, debtPerson, tags } = transaction;
  const flags: TransactionRowFlag[] = [];

  if (transaction.pending) {
    flags.push({
      key: 'pending',
      chip: (
        <Chip tone="warn" icon="clock">
          Pendente
        </Chip>
      ),
      node: 'Pendente',
      text: 'Pendente',
    });
  }
  if (transaction.toReview) {
    flags.push({
      key: 'review',
      chip: <Chip tone="dashed">Para revisar</Chip>,
      node: 'Para revisar',
      text: 'Para revisar',
    });
  }
  if (transaction.bankChanged) {
    flags.push({
      key: 'bank-changed',
      chip: (
        <Chip tone="warn" icon="warning">
          Banco alterou o original
        </Chip>
      ),
      node: 'Banco alterou o original',
      text: 'Banco alterou o original',
    });
  }
  if (transaction.ignored) {
    flags.push({
      key: 'ignored',
      chip: <Chip icon="eye-off">Ignorada</Chip>,
      node: 'Ignorada',
      text: 'Ignorada',
    });
  }
  if (transaction.outOfAccount) {
    flags.push({
      key: 'out-of-account',
      chip: <Chip tone="ok">Fora da conta</Chip>,
      node: 'Fora da conta',
      text: 'Fora da conta',
    });
  }
  if (transaction.edited) {
    flags.push({
      key: 'edited',
      chip: (
        <Chip tone="ok" icon="edit">
          Editada
        </Chip>
      ),
      node: 'Editada',
      text: 'Editada',
    });
  }
  if (splitParts && splitParts > 1) {
    flags.push({
      key: 'split',
      chip: <Chip icon="split">Dividida em {splitParts}</Chip>,
      node: `Dividida em ${splitParts}`,
      text: `Dividida em ${splitParts}`,
    });
  }
  if (installment) {
    const text = `Parcela ${installment.number} de ${installment.total}`;
    flags.push({ key: 'installment', chip: <Chip>{text}</Chip>, node: text, text });
  }
  if (debtPaidCents !== undefined) {
    const suffix = `da dívida${debtPerson ? ` com ${debtPerson}` : ''}`;
    flags.push({
      key: 'debt',
      chip: (
        <Chip tone="ok" icon="hand-money">
          Abateu <Money cents={debtPaidCents} sign="none" weight="plain" className="text-meta" />{' '}
          {suffix}
        </Chip>
      ),
      node: (
        <>
          Abateu <Money cents={debtPaidCents} sign="none" weight="plain" /> {suffix}
        </>
      ),
    });
  }
  for (const tag of tags ?? []) {
    flags.push({
      key: `tag-${tag}`,
      chip: (
        <Chip tone="tag" icon="hash">
          {tag}
        </Chip>
      ),
      node: `#${tag}`,
      text: `#${tag}`,
    });
  }

  return flags;
}
