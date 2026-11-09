// The port that keeps a secret unreadable outside this PC and this Windows user (DPAPI, scope of
// the current user; adapter in `infra/secret/`). The text goes in and comes out whole; the bytes
// are what the table keeps.
export interface SecretCipher {
  encrypt(plainText: string): Promise<Buffer>;
  // Throws when the bytes do not decrypt here (another PC or user, or a damaged file).
  decrypt(encrypted: Buffer): Promise<string>;
}
