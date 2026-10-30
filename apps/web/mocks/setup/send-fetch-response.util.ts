import type { ServerResponse } from 'node:http';

// Writes a Fetch `Response` (status, headers, body) on the Node response of the Vite dev server.
export async function sendFetchResponse(response: Response, outgoing: ServerResponse) {
  outgoing.statusCode = response.status;
  if (response.statusText) outgoing.statusMessage = response.statusText;

  response.headers.forEach((value, name) => {
    // `forEach` joins repeated Set-Cookie into one line; they go out separately below.
    if (name !== 'set-cookie') outgoing.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) outgoing.setHeader('set-cookie', cookies);

  outgoing.end(Buffer.from(await response.arrayBuffer()));
}
