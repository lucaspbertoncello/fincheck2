import { describe, expect, it, vi } from 'vitest';

import { DpapiSecretCipher } from '#/modules/sync/infra/secret/dpapi-secret-cipher.service.ts';

// Each call opens PowerShell, which takes longer than the default 5 s on a busy machine.
vi.setConfig({ testTimeout: 30_000 });

const SECRETS = [
  'my-client-secret',
  'ação ✓ coração 😀 "aspas" \'simples\' $var `tick` & | > <',
  'x'.repeat(200),
];

describe.skipIf(process.platform !== 'win32')('DpapiSecretCipher on Windows', () => {
  const cipher = new DpapiSecretCipher();

  it.each(SECRETS)('decrypts what it encrypted: %s', async (secret) => {
    const encrypted = await cipher.encrypt(secret);

    expect(await cipher.decrypt(encrypted)).toBe(secret);
  });

  it('does not keep the text in the encrypted bytes', async () => {
    const secret = 'plain-visible-secret-123';
    const encrypted = await cipher.encrypt(secret);

    expect(encrypted.toString('utf8')).not.toContain(secret);
    expect(encrypted.toString('base64')).not.toContain(Buffer.from(secret).toString('base64'));
    expect(encrypted.includes(Buffer.from(secret, 'utf8'))).toBe(false);
  });

  it('throws when the bytes were tampered with', async () => {
    const encrypted = await cipher.encrypt('another secret');
    const tampered = Buffer.from(encrypted);

    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 0xff;
    tampered[tampered.length - 5] = (tampered[tampered.length - 5] ?? 0) ^ 0xff;

    await expect(cipher.decrypt(tampered)).rejects.toThrow('The secret could not be decrypted');
  });

  it('throws without repeating the data when the bytes are not DPAPI', async () => {
    await expect(cipher.decrypt(Buffer.from('not-a-blob-secret'))).rejects.toThrow(
      'The secret could not be decrypted',
    );
  });
});

describe.skipIf(process.platform === 'win32')('DpapiSecretCipher outside Windows', () => {
  const cipher = new DpapiSecretCipher();

  it('throws on encrypt and on decrypt', async () => {
    await expect(cipher.encrypt('secret')).rejects.toThrow('The secret could not be encrypted');
    await expect(cipher.decrypt(Buffer.from('x'))).rejects.toThrow(
      'The secret could not be decrypted',
    );
  });
});
