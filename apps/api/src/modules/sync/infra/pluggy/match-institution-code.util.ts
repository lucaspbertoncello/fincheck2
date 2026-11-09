import { INSTITUTIONS } from '@fincheck/shared/accounts/institution/institution.constant.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

// Legal names the Open Finance gives that do not carry the brand ("Nu Pagamentos S.A." is Nubank,
// "Banco C6 S.A." is C6 Bank). Whole words, compared normalized.
const ALIASES: readonly { words: string; code: Institution.Code }[] = [
  { words: 'nu pagamentos', code: 'nubank' },
  { words: 'nu financeira', code: 'nubank' },
  { words: 'banco c6', code: 'c6' },
  { words: 'itau unibanco', code: 'itau' },
];

// The pre-registered bank whose name is inside the name of the connector ("Itau Cartoes" is Itau);
// the name has to be whole words, so "Inter" does not match "International". Otherwise `other`.
export function matchInstitutionCode(connectorName: string): Institution.Code {
  const normalized = ` ${normalizeText(connectorName)} `;
  const found = INSTITUTIONS.find((institution) =>
    normalized.includes(` ${normalizeText(institution.name)} `),
  );
  if (found) return found.code;

  const alias = ALIASES.find(({ words }) => normalized.includes(` ${normalizeText(words)} `));

  return alias?.code ?? 'other';
}
