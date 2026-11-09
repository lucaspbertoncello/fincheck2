/**
 * Whether a request to `/api` may reach the API through the dev proxy (which adds the local token).
 * Only the dev server's own address as `Host` (blocks DNS rebinding), and, when the browser sends an
 * `Origin`, only the same origin (blocks a page of another site, CSRF).
 */
export function isAllowedApiRequest(
  headers: { host?: string | undefined; origin?: string | undefined },
  port: number,
): boolean {
  const { host, origin } = headers;
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return false;

  return origin === undefined || origin === `http://${host}`;
}
