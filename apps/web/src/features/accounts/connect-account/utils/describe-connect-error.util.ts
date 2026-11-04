import { hasApiErrorCode, isApiError } from '#/shared/api/api.error.ts';

const MESSAGES: Record<string, string> = {
  SYNC_NOT_CONFIGURED:
    'As chaves do Open Finance ainda não foram salvas. Configure em Configurações.',
  SYNC_ITEM_NOT_FOUND: 'O Open Finance não achou essa conexão. Confira o código no site.',
  SYNC_CREDENTIALS_INVALID: 'O Open Finance recusou as chaves salvas. Atualize em Configurações.',
  SYNC_PROVIDER_UNAVAILABLE:
    'Não deu para falar com o Open Finance agora. Tente de novo em instantes.',
  SYNC_CONNECTION_ALREADY_EXISTS: 'Esse banco já está conectado.',
};

/** The errors that trying again does not fix: the keys have to be saved or changed in Configurações. */
const SETTINGS_CODES = new Set(['SYNC_NOT_CONFIGURED', 'SYNC_CREDENTIALS_INVALID']);

/** What to tell the person when connecting a bank or creating an account failed. */
export function describeConnectError(error: unknown): string {
  if (isApiError(error)) {
    const known = MESSAGES[error.code];
    if (known) return known;
    if (hasApiErrorCode(error, 'NETWORK_ERROR')) return 'Sem resposta da API. Ela está no ar?';
  }
  return 'Não deu certo. Tente de novo.';
}

/** True when the way out of the error is Configurações (the saved keys), not "tentar de novo". */
export function connectErrorNeedsSettings(error: unknown): boolean {
  return isApiError(error) && SETTINGS_CODES.has(error.code);
}
