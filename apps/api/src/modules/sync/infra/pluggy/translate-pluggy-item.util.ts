import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { matchInstitutionCode } from '#/modules/sync/infra/pluggy/match-institution-code.util.ts';
import type { PluggyItem } from '#/modules/sync/infra/pluggy/pluggy-item.type.ts';

// The user has to act on the bank side (login, second factor, authorization, an account that is
// locked, that wants a new term accepted or a password reset). Statuses of
// https://docs.pluggy.ai/en/docs/connections/item-lifecycle (read on 09/11/2026).
const LOGIN_PROBLEMS = new Set([
  'LOGIN_ERROR',
  'INVALID_CREDENTIALS',
  'INVALID_CREDENTIALS_MFA',
  'USER_INPUT_TIMEOUT',
  'WAITING_USER_INPUT',
  'WAITING_USER_ACTION',
  'USER_AUTHORIZATION_NOT_GRANTED',
  'ACCOUNT_LOCKED',
  'ACCOUNT_NEEDS_ACTION',
  'ACCOUNT_CREDENTIALS_RESET',
]);
// Still going: the user has to authorize on the phone, and the Pluggy goes on by itself after.
const RUNNING = new Set(['CREATED', 'UPDATING', 'MERGING', 'USER_AUTHORIZATION_PENDING']);
const FINISHED = new Set(['SUCCESS', 'PARTIAL_SUCCESS']);
const CONSENT_WORDS = ['CONSENT', 'REVOKED', 'EXPIRED'];

// The state of a connection as the port says it. `nowIso` is the instant of the clock, to tell
// whether the consent already ended. The `error.message` of the Pluggy never goes through: it is
// free text of the bank and can carry what the user typed.
export function translatePluggyItem(
  response: PluggyItem.Response,
  nowIso: string,
): BankDataProvider.Item {
  if (typeof response.id !== 'string' || response.id === '') {
    throw new TypeError('The item has no id');
  }
  if (typeof response.connector?.name !== 'string') {
    throw new TypeError('The item has no connector');
  }
  const status = typeof response.status === 'string' ? response.status : '';
  const execution = typeof response.executionStatus === 'string' ? response.executionStatus : '';
  const errorCode =
    typeof response.error?.code === 'string' ? response.error.code.toUpperCase() : '';
  const consentEnd = Date.parse(response.consentExpiresAt ?? '');
  const consentLost =
    CONSENT_WORDS.some((word) => errorCode.includes(word)) ||
    execution === 'USER_AUTHORIZATION_REVOKED' ||
    (!Number.isNaN(consentEnd) && consentEnd < Date.parse(nowIso));
  const loginProblem = LOGIN_PROBLEMS.has(status) || LOGIN_PROBLEMS.has(execution);
  const updating =
    !loginProblem &&
    (status === 'UPDATING' || RUNNING.has(execution) || execution.endsWith('_IN_PROGRESS'));
  const finished = status === 'UPDATED' && FINISHED.has(execution);
  const lastUpdated = Date.parse(response.lastUpdatedAt ?? '');
  const base = {
    id: response.id,
    institutionName: response.connector.name,
    institutionCode: matchInstitutionCode(response.connector.name),
    lastUpdatedAt: Number.isNaN(lastUpdated) ? null : new Date(lastUpdated).toISOString(),
  };

  if (updating) return { ...base, state: 'updating', errorCode: null };
  if (consentLost) return { ...base, state: 'error', errorCode: 'CONSENT_REVOKED' };
  if (loginProblem) return { ...base, state: 'error', errorCode: 'LOGIN_ERROR' };
  if (finished) return { ...base, state: 'ok', errorCode: null };

  return { ...base, state: 'error', errorCode: 'PROVIDER_ERROR' };
}
