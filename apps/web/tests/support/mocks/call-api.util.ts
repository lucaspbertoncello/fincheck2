interface ApiAnswer {
  status: number;
  json: unknown;
}

// Calls a route of the mock API the way the app would (`/api/...`), through the test MSW server.
export async function callApi(method: string, path: string, body?: unknown): Promise<ApiAnswer> {
  const response = await fetch(new URL(`/api${path}`, window.location.origin), {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();

  return { status: response.status, json: text ? (JSON.parse(text) as unknown) : null };
}
