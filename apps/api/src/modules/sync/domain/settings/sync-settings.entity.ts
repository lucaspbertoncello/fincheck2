// The keys of the Pluggy Lucas saved: one row only (RNF-004). The secret is kept ciphered with the
// Windows user's DPAPI (`SecretCipher`); this object never holds it in clear text. It only opens on
// this PC and by this user: restored elsewhere it does not decrypt, and the settings count as "not
// configured" until the keys are saved again.
export class SyncSettings {
  readonly clientId: string;
  readonly secretEncrypted: Uint8Array;
  readonly updatedAt: string;

  constructor(attr: SyncSettings.Attributes) {
    this.clientId = attr.clientId;
    this.secretEncrypted = attr.secretEncrypted;
    this.updatedAt = attr.updatedAt;
  }
}

export namespace SyncSettings {
  export type Attributes = {
    clientId: string;
    secretEncrypted: Uint8Array;
    updatedAt: string;
  };
}
