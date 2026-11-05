import { isApiError } from '#/shared/api/api.error.ts';

/** The errors that trying again does not fix: the keys have to be saved or changed in Configurações. */
const SETTINGS_CODES = new Set(['SYNC_NOT_CONFIGURED', 'SYNC_CREDENTIALS_INVALID']);

/** True when the way out of the error is Configurações (the saved keys), not "tentar de novo". */
export function connectErrorNeedsSettings(error: unknown): boolean {
  return isApiError(error) && SETTINGS_CODES.has(error.code);
}
