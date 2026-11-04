import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

// The short reason after "Conexão com erro", one per `errorCode` of the contract.
export const CONNECTION_ERROR_REASON: Record<Connection.ErrorCode, string> = {
  CONSENT_REVOKED: 'consentimento revogado',
  LOGIN_ERROR: 'login com erro',
  STALE_DATA: 'sem dados novos há dias',
  PROVIDER_ERROR: 'falha no Open Finance',
};
