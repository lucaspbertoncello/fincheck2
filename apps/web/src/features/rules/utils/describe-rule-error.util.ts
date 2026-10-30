import { isApiError } from '#/shared/api/api.error.ts';

const MESSAGES: Record<string, string> = {
  RULE_DUPLICATE: 'Já existe uma regra com essa condição.',
  RULE_ACTION_REQUIRED: 'Escolha uma categoria ou ao menos uma tag.',
  RULE_CATEGORY_ARCHIVED: 'Essa categoria está arquivada. Escolha outra.',
  RULE_TAG_ARCHIVED: 'Uma das tags está arquivada. Tire-a da regra ou desarquive.',
  RULE_CATEGORY_KIND_MISMATCH: 'A categoria não combina com o tipo da regra (despesa ou receita).',
  RULE_DISABLED: 'A regra está desligada. Ligue-a para aplicar no histórico.',
  RULE_NOT_FOUND: 'Essa regra não existe mais.',
};

/** What went wrong with a rule write, as a sentence for the person; the contract `code` decides. */
export function describeRuleError(error: unknown): string {
  if (isApiError(error)) {
    const message = MESSAGES[error.code];
    if (message) return message;
  }
  return 'Não deu para salvar a regra agora. Tente de novo.';
}
