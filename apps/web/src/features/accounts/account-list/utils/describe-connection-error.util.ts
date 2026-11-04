import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

const REASON: Record<Connection.ErrorCode, string> = {
  CONSENT_REVOKED: 'consentimento revogado',
  LOGIN_ERROR: 'login com erro',
  STALE_DATA: 'dados parados',
  PROVIDER_ERROR: 'Open Finance indisponível',
};

/** The short reason of a connection error ("login com erro"), for the error line of the card. */
export function describeConnectionError(code: Connection.ErrorCode | null): string | undefined {
  return code ? REASON[code] : undefined;
}
