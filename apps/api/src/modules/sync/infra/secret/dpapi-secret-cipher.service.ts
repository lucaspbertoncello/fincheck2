import type { SecretCipher } from '#/modules/sync/application/settings/secret-cipher.interface.ts';
import { runPowershellScript } from '#/modules/sync/infra/secret/run-powershell-script.util.ts';

// The scripts are fixed and carry no data: the text comes in by stdin, as base64, so no quote,
// accent or line break can break it, and goes out as base64 with no line break.
const PROTECT_SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Security
$text = [Console]::In.ReadToEnd().Trim()
$bytes = [System.Convert]::FromBase64String($text)
$result = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Out.Write([System.Convert]::ToBase64String($result))
`;
const UNPROTECT_SCRIPT = PROTECT_SCRIPT.replace('::Protect(', '::Unprotect(');

// Windows DPAPI, scope of the current user, through the PowerShell that comes with Windows (no
// dependency): what it ciphers only opens on this PC, by this Windows user. On another system the
// two methods throw, and the layer above reads it as "not configured".
export class DpapiSecretCipher implements SecretCipher {
  async encrypt(plainText: string): Promise<Buffer> {
    if (process.platform !== 'win32') throw new Error('The secret could not be encrypted');
    try {
      const output = await runPowershellScript(
        PROTECT_SCRIPT,
        Buffer.from(plainText, 'utf8').toString('base64'),
      );

      return Buffer.from(output, 'base64');
    } catch {
      throw new Error('The secret could not be encrypted');
    }
  }

  async decrypt(encrypted: Buffer): Promise<string> {
    if (process.platform !== 'win32') throw new Error('The secret could not be decrypted');
    try {
      const output = await runPowershellScript(UNPROTECT_SCRIPT, encrypted.toString('base64'));

      return Buffer.from(output, 'base64').toString('utf8');
    } catch {
      throw new Error('The secret could not be decrypted');
    }
  }
}
