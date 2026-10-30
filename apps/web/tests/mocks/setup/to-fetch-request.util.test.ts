import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';

import { sendFetchResponse } from '#mocks/setup/send-fetch-response.util.ts';
import { toFetchRequest } from '#mocks/setup/to-fetch-request.util.ts';

function incoming(init: {
  method: string;
  url: string;
  headers?: Record<string, string | string[]>;
  body?: string;
}) {
  const stream = Readable.from(init.body ? [Buffer.from(init.body)] : []);
  return Object.assign(stream, {
    method: init.method,
    url: init.url,
    headers: init.headers ?? {},
  }) as unknown as IncomingMessage;
}

describe('toFetchRequest', () => {
  it('keeps method, url with query, headers and the JSON body', async () => {
    const request = await toFetchRequest(
      incoming({
        method: 'POST',
        url: '/api/accounts?x=1',
        headers: { 'content-type': 'application/json', 'x-multi': ['a', 'b'] },
        body: '{"name":"Conta"}',
      }),
      'http://127.0.0.1:5192',
    );

    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://127.0.0.1:5192/api/accounts?x=1');
    expect(request.headers.get('content-type')).toBe('application/json');
    expect(request.headers.get('x-multi')).toBe('a, b');
    expect(await request.json()).toEqual({ name: 'Conta' });
  });

  it('sends no body on GET', async () => {
    const request = await toFetchRequest(
      incoming({ method: 'GET', url: '/api/health' }),
      'http://127.0.0.1:5192',
    );

    expect(request.body).toBeNull();
  });
});

describe('sendFetchResponse', () => {
  it('writes status, headers and body', async () => {
    const headers = new Map<string, unknown>();
    let ended: Buffer | undefined;
    const outgoing = {
      statusCode: 0,
      statusMessage: '',
      setHeader: (name: string, value: unknown) => headers.set(name, value),
      end: (chunk: Buffer) => {
        ended = chunk;
      },
    } as unknown as ServerResponse;

    const response = Response.json({ ok: true }, { status: 201 });
    response.headers.append('set-cookie', 'a=1');
    response.headers.append('set-cookie', 'b=2');
    await sendFetchResponse(response, outgoing);

    expect(outgoing.statusCode).toBe(201);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('set-cookie')).toEqual(['a=1', 'b=2']);
    expect(ended?.toString()).toBe('{"ok":true}');
  });
});
