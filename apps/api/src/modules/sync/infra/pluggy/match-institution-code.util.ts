import { INSTITUTIONS } from '@fincheck/shared/accounts/institution/institution.constant.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

// The pre-registered bank whose name is inside the name of the connector ("Itau Cartoes" is Itau);
// the name has to be whole words, so "Inter" does not match "International". Otherwise `other`.
export function matchInstitutionCode(connectorName: string): Institution.Code {
  const normalized = ` ${normalizeText(connectorName)} `;
  const found = INSTITUTIONS.find((institution) =>
    normalized.includes(` ${normalizeText(institution.name)} `),
  );

  return found?.code ?? 'other';
}
