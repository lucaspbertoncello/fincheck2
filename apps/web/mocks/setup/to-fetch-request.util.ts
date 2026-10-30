import type { IncomingMessage } from 'node:http';

// Turns the Node request of the Vite dev server into a Fetch `Request`, the shape MSW handlers read.
export async function toFetchRequest(incoming: IncomingMessage, origin: string): Promise<Request> {
  const method = incoming.method ?? 'GET';

  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
  }

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const chunks: Buffer[] = [];
  if (hasBody) {
    for await (const chunk of incoming) chunks.push(Buffer.from(chunk as Uint8Array));
  }

  return new Request(new URL(incoming.url ?? '/', origin), {
    method,
    headers,
    body: hasBody && chunks.length > 0 ? Buffer.concat(chunks) : undefined,
  });
}
