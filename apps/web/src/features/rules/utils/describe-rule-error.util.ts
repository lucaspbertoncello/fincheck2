import { isApiError, type ApiError } from '#/shared/api/api.error.ts';

const MESSAGES: Record<string, string> = {
  RULE_DUPLICATE: 'Já existe uma regra com essa condição.',
  RULE_ACTION_REQUIRED: 'Escolha a categoria da regra. As tags dela se escolhem depois.',
  RULE_TAG_CATEGORY_MISMATCH: 'A regra só pode usar tags da categoria que ela aplica.',
  RULE_CATEGORY_ARCHIVED: 'Essa categoria está arquivada. Escolha outra.',
  RULE_TAG_ARCHIVED: 'Uma das tags está arquivada. Tire-a da regra ou desarquive.',
  RULE_CATEGORY_KIND_MISMATCH: 'A categoria não combina com o tipo da regra (despesa ou receita).',
  RULE_DISABLED: 'A regra está desligada. Ligue-a para aplicar no histórico.',
  RULE_NOT_FOUND: 'Essa regra não existe mais.',
};

// The 400 of the API names the field in `details.issues`: a pattern that is too short (or too long)
// once normalized is the one a suggestion can hit.
function hasIssueAt(error: ApiError, path: string): boolean {
  const issues = error.details?.['issues'];

  return (
    Array.isArray(issues) &&
    issues.some(
      (issue: unknown) =>
        typeof issue === 'object' && issue !== null && 'path' in issue && issue.path === path,
    )
  );
}

/** What went wrong with a rule write, as a sentence for the person; the contract `code` decides. */
export function describeRuleError(error: unknown): string {
  if (isApiError(error)) {
    const message = MESSAGES[error.code];
    if (message) return message;
    if (error.code === 'VALIDATION_FAILED' && hasIssueAt(error, 'pattern'))
      return 'O texto da regra precisa ter de 2 a 100 caracteres, sem contar o número da parcela.';
  }
  return 'Não deu para salvar a regra agora. Tente de novo.';
}
