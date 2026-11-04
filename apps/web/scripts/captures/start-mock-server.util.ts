import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findFreePort } from '#scripts/captures/find-free-port.util.ts';

export type MockServer = { origin: string; stop: () => void };

const READY_TIMEOUT_MS = 60_000;

/**
 * Starts the web in `--mode mocks` on 127.0.0.1 and a free port, with the mock clock frozen at
 * `now`, and waits until it answers. `stop` kills the whole process tree (on Windows a plain kill
 * can leave children behind).
 */
export async function startMockServer(now: string): Promise<MockServer> {
  const port = await findFreePort();
  const viteEntry = fileURLToPath(import.meta.resolve('vite'));
  const viteBin = join(dirname(viteEntry), '..', '..', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, '--mode', 'mocks', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: join(import.meta.dirname, '..', '..'),
      env: { ...process.env, FINCHECK_MOCK_NOW: now, TZ: 'America/Sao_Paulo' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  let output = '';
  child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
  let exited = false;
  child.once('exit', () => (exited = true));

  const stop = () => killTree(child);
  const origin = `http://127.0.0.1:${port}`;

  try {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (exited) throw new Error(`The mock server exited early:\n${output}`);
      if (await answers(`${origin}/api/health`)) return { origin, stop };
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`The mock server did not answer in ${READY_TIMEOUT_MS / 1000}s:\n${output}`);
  } catch (error) {
    stop();
    throw error;
  }
}

async function answers(url: string): Promise<boolean> {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

function killTree(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    child.kill('SIGKILL');
  }
}
