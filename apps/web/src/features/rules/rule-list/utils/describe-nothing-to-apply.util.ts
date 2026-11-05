import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

/** One line saying why "Aplicar nas transações existentes" has nothing to change. */
export function describeNothingToApply(preview: Rule.Preview): string {
  if (preview.matchCount === 0) return 'Nenhuma transação do histórico bate com essa regra.';

  if (preview.matchCount === 1)
    return 'A transação que a regra pega já está certa, ou foi categorizada à mão, por recorrência ou pela conta: a regra não sobrescreve.';

  return `As ${preview.matchCount} transações que a regra pega já estão certas, ou foram categorizadas à mão, por recorrência ou pela conta: a regra não sobrescreve.`;
}
