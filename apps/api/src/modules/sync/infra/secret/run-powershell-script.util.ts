import { spawn } from 'node:child_process';
import { win32 } from 'node:path';

const TIMEOUT_MS = 15_000;
// The PowerShell of Windows by its full path, not whatever `powershell.exe` the PATH finds first: the
// one that decrypts the secret of the Pluggy must be the one of the system.
const POWERSHELL = win32.join(
  process.env['SystemRoot'] ?? String.raw`C:\Windows`,
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe',
);

// Runs a fixed PowerShell script (`-EncodedCommand`, so there is no quoting) and returns what it
// writes to stdout. The data goes in by stdin, never in the command line (where any process of the
// PC could read it). Rejects with `Error('failed')` when it does not exit with 0, writes to stderr,
// does not start or takes more than 15 s: nothing of the data or of the output in the message.
export function runPowershellScript(script: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fail = (): void => reject(new Error('failed'));
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const child = spawn(POWERSHELL, ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    let hasStderr = false;
    const timer = setTimeout(() => {
      child.kill();
      fail();
    }, TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', () => {
      hasStderr = true;
    });
    child.stdin.on('error', () => undefined);
    child.on('error', () => {
      clearTimeout(timer);
      fail();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 || hasStderr) return fail();
      resolve(Buffer.concat(stdout).toString('utf8').trim());
    });
    child.stdin.end(input);
  });
}
