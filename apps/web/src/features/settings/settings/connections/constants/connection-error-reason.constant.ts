import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

// The line under "Conexão com erro", one per `errorCode` of the contract. `LOGIN_ERROR` and
// `PROVIDER_ERROR` also receive the states of the Pluggy that have no code of their own (account
// locked, action asked by the bank, credentials reset), so they say what to do, not only what broke.
export const CONNECTION_ERROR_REASON: Record<Connection.ErrorCode, string> = {
  CONSENT_REVOKED:
    'Consentimento revogado no Open Finance. Reconecte para voltar a receber os dados.',
  LOGIN_ERROR:
    'Login com erro: o banco recusou o acesso (senha trocada, conta bloqueada ou ação pedida pelo banco). Resolva no banco e reconecte.',
  STALE_DATA: 'O banco não manda dados novos há mais de 3 dias.',
  PROVIDER_ERROR:
    'Falha no Open Finance, ou o banco está num estado que o app não reconhece. Tente de novo mais tarde.',
};
