// The local token every route but `/health` asks for in `X-Fincheck-Token` (contract, "Endereço e
// acesso"). How it reaches the front is the back's call; until then it comes from the build
// environment, with a development default (the mocks accept any token).
export const API_TOKEN_HEADER = 'X-Fincheck-Token';
export const API_TOKEN = (import.meta.env['VITE_FINCHECK_TOKEN'] as string | undefined) ?? 'dev';
