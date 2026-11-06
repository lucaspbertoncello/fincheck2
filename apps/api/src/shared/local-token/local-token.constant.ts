// The header every route (but `GET /health`) must carry with the local token.
export const LOCAL_TOKEN_HEADER = 'X-Fincheck-Token';

// The file in the data folder that keeps the token between runs (outside Git, like the database).
export const LOCAL_TOKEN_FILE_NAME = 'local-token';
