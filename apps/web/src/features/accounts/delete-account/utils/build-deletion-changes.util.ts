import type { DeletionImpact } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.type.ts';
import type { ConfirmChange } from '@fincheck/ui';

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`;
}

/** The "o que muda" list of the delete confirmation, from the impact the API counted. */
export function buildDeletionChanges(impact: DeletionImpact.Dto): ConfirmChange[] {
  const changes: ConfirmChange[] = [];

  if (impact.transactionCount > 0) {
    changes.push({
      icon: 'trash',
      text: `${plural(impact.transactionCount, 'transação será apagada', 'transações serão apagadas')}, inclusive as ignoradas.`,
    });
  }
  if (impact.installmentPlanCount > 0) {
    changes.push({
      icon: 'trash',
      text: `${plural(impact.installmentPlanCount, 'compra parcelada será apagada', 'compras parceladas serão apagadas')}.`,
    });
  }
  if (impact.invoiceCount > 0) {
    changes.push({
      icon: 'trash',
      text: `${plural(impact.invoiceCount, 'fatura será apagada', 'faturas serão apagadas')}.`,
    });
  }
  if (impact.ruleCount > 0) {
    changes.push({
      icon: 'trash',
      text: `${plural(impact.ruleCount, 'regra de categoria será apagada', 'regras de categoria serão apagadas')}, porque dependem desta conta.`,
    });
  }
  if (impact.returnsOnNextSync) {
    changes.push({
      icon: 'sync',
      text: 'O Pluggy manda a conta de novo na próxima busca, como conta nova e sem histórico. Para só tirá-la de vista, arquive.',
    });
  }

  return changes;
}
