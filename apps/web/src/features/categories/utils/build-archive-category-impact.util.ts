import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { ConfirmChange } from '@fincheck/ui';

/** What archiving a category changes and what stays, for the confirmation dialog. */
export function buildArchiveCategoryImpact(category: Category.Dto): ConfirmChange[] {
  const transactions =
    category.transactionCount === 0
      ? 'Nenhuma transação usa essa categoria.'
      : category.transactionCount === 1
        ? '1 transação continua nela e segue somando no histórico.'
        : `${category.transactionCount} transações continuam nela e seguem somando no histórico.`;

  const changes: ConfirmChange[] = [
    { icon: 'check', text: 'Sai da escolha de categoria nas transações novas.' },
    { icon: 'check', text: transactions },
  ];

  if (category.ruleCount > 0) {
    changes.push({
      icon: 'magic',
      text:
        category.ruleCount === 1
          ? '1 regra segue ligada, mas a categoria deixa de ser posta, e as tags dela junto.'
          : `${category.ruleCount} regras seguem ligadas, mas a categoria deixa de ser posta, e as tags delas junto.`,
    });
  }

  changes.push({ icon: 'history', text: 'Você pode desarquivar quando quiser.' });
  return changes;
}
