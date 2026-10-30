import { createRuleRequestSchema } from '@fincheck/shared/categories/rule/rule.schema.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import type { RuleFormErrors } from '#/features/rules/rule-form/types/rule-form.type.ts';

type RuleFormValues = {
  description: string;
  categoryId: string | null;
  tagIds: readonly string[];
};

type RuleFormResult =
  { ok: true; body: Rule.CreateRequest } | { ok: false; errors: RuleFormErrors };

/** Checks the form with the request schema of the contract; the messages are the screen's, in pt-BR. */
export function validateRuleForm(values: RuleFormValues): RuleFormResult {
  const parsed = createRuleRequestSchema.safeParse({
    descriptionContains: values.description,
    categoryId: values.categoryId ?? undefined,
    tagIds: values.tagIds.length > 0 ? [...values.tagIds] : undefined,
  });
  const errors: RuleFormErrors = {};

  if (!parsed.success) {
    const issue = parsed.error.issues.find((item) => item.path[0] === 'descriptionContains');
    errors.description =
      issue?.code === 'too_big'
        ? 'Use até 100 caracteres.'
        : 'Escreva um trecho da descrição, com pelo menos 2 letras.';
  }
  if (values.categoryId === null && values.tagIds.length === 0) {
    errors.action = 'Escolha uma categoria ou ao menos uma tag.';
  }

  if (parsed.success && !errors.action) return { ok: true, body: parsed.data };
  return { ok: false, errors };
}
