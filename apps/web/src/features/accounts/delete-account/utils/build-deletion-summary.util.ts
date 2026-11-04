import type { DeletionImpact } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.type.ts';

import type { DeletionSummary } from '#/features/accounts/delete-account/types/deletion-summary.type.ts';

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`;
}

/** What the delete takes, what it leaves, and what the sync brings back, from the impact the API counted. */
export function buildDeletionSummary(impact: DeletionImpact.Dto): DeletionSummary {
  const gone: string[] = [];

  if (impact.transactionCount > 0) {
    gone.push(
      `${plural(impact.transactionCount, 'transação será apagada', 'transações serão apagadas')}, inclusive as ignoradas.`,
    );
  }
  if (impact.installmentPlanCount > 0) {
    gone.push(
      `${plural(impact.installmentPlanCount, 'compra parcelada será apagada', 'compras parceladas serão apagadas')}.`,
    );
  }
  if (impact.invoiceCount > 0) {
    gone.push(`${plural(impact.invoiceCount, 'fatura será apagada', 'faturas serão apagadas')}.`);
  }
  if (impact.ruleCount > 0) {
    gone.push(
      `${plural(impact.ruleCount, 'regra de categoria será apagada', 'regras de categoria serão apagadas')}, porque dependem desta conta.`,
    );
  }

  return {
    gone,
    stays: ['As outras contas, as categorias e as regras que não dependem desta conta.'],
    returnNote: impact.returnsOnNextSync
      ? 'O Open Finance manda a conta de novo na próxima busca, como conta nova e sem histórico. Para só tirá-la de vista, arquive.'
      : null,
  };
}
