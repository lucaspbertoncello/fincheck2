import { describe, expect, it } from 'vitest';

import { isAllowedApiRequest } from '#scripts/dev-server/is-allowed-api-request.util.ts';

describe('isAllowedApiRequest', () => {
  it('accepts the right Host, 127.0.0.1 or localhost, with no Origin', () => {
    expect(isAllowedApiRequest({ host: '127.0.0.1:5173' }, 5173)).toBe(true);
    expect(isAllowedApiRequest({ host: 'localhost:5173' }, 5173)).toBe(true);
  });

  it('refuses a strange Host (DNS rebinding) or another port', () => {
    expect(isAllowedApiRequest({ host: 'evil.example:5173' }, 5173)).toBe(false);
    expect(isAllowedApiRequest({ host: '127.0.0.1:3333' }, 5173)).toBe(false);
    expect(isAllowedApiRequest({}, 5173)).toBe(false);
  });

  it('follows the configured port', () => {
    expect(isAllowedApiRequest({ host: '127.0.0.1:5183' }, 5183)).toBe(true);
    expect(isAllowedApiRequest({ host: '127.0.0.1:5173' }, 5183)).toBe(false);
  });

  it('accepts an Origin equal to the Host', () => {
    expect(
      isAllowedApiRequest({ host: '127.0.0.1:5173', origin: 'http://127.0.0.1:5173' }, 5173),
    ).toBe(true);
  });

  it('refuses a strange Origin, including "null"', () => {
    expect(
      isAllowedApiRequest({ host: '127.0.0.1:5173', origin: 'https://evil.example' }, 5173),
    ).toBe(false);
    expect(isAllowedApiRequest({ host: '127.0.0.1:5173', origin: 'null' }, 5173)).toBe(false);
  });
});
