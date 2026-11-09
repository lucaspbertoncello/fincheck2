import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { recoverInterruptedSwap } from '#/database/recover-interrupted-swap.util.ts';

describe('recoverInterruptedSwap', () => {
  let folder: string;
  let file: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'fincheck-recover-'));
    file = join(folder, 'fincheck.db');
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('puts the old database back when the process died between the two moves', () => {
    writeFileSync(`${file}.replaced`, 'old database');

    expect(recoverInterruptedSwap(file)).toBe(true);

    expect(readFileSync(file, 'utf8')).toBe('old database');
    expect(existsSync(`${file}.replaced`)).toBe(false);
  });

  it('brings back the newest preserved database (the name a failed swap gives it), not its sidecar files', () => {
    writeFileSync(`${file}.preserved-0001`, 'older');
    writeFileSync(`${file}.preserved-0002`, 'newer');
    writeFileSync(`${file}.preserved-0002-shm`, 'sidecar');

    expect(recoverInterruptedSwap(file)).toBe(true);

    expect(readFileSync(file, 'utf8')).toBe('newer');
    expect(existsSync(`${file}.preserved-0001`)).toBe(true);
  });

  it('prefers the .replaced file to a preserved one', () => {
    writeFileSync(`${file}.preserved-0001`, 'preserved');
    writeFileSync(`${file}.replaced`, 'replaced');

    recoverInterruptedSwap(file);

    expect(readFileSync(file, 'utf8')).toBe('replaced');
  });

  it('does nothing when the database is in place, and keeps the leftover', () => {
    writeFileSync(file, 'restored');
    writeFileSync(`${file}.replaced`, 'old database');

    expect(recoverInterruptedSwap(file)).toBe(false);

    expect(readFileSync(file, 'utf8')).toBe('restored');
    expect(existsSync(`${file}.replaced`)).toBe(true);
  });

  it('does nothing on a first start (neither file)', () => {
    expect(recoverInterruptedSwap(file)).toBe(false);
    expect(existsSync(file)).toBe(false);
  });
});
