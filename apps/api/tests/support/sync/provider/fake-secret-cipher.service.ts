import type { SecretCipher } from '#/modules/sync/application/settings/secret-cipher.interface.ts';

// The cipher of the secret as a double of the port: reversible, with no PowerShell, and it never
// gives the clear text back as the ciphered bytes. `breakDecrypt` makes it fail the way the real one
// does on another PC or Windows user. `decryptCount` counts the decryptions (each one is a PowerShell
// in the real cipher), for a test that says how many a round may make.
export class FakeSecretCipher implements SecretCipher {
  private broken = false;
  decryptCount = 0;

  breakDecrypt(): void {
    this.broken = true;
  }

  async encrypt(plainText: string): Promise<Buffer> {
    return Buffer.from(`enc:${Buffer.from(plainText, 'utf8').toString('base64')}`, 'utf8');
  }

  async decrypt(encrypted: Buffer): Promise<string> {
    this.decryptCount += 1;
    const text = encrypted.toString('utf8');
    if (this.broken || !text.startsWith('enc:'))
      throw new Error('The secret could not be decrypted');

    return Buffer.from(text.slice(4), 'base64').toString('utf8');
  }
}
