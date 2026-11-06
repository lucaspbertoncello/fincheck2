import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_FILE_NAME } from '#/shared/local-token/local-token.constant.ts';
import { resolveLocalToken } from '#/shared/local-token/resolve-local-token.util.ts';

describe('resolveLocalToken', () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'fincheck-token-'));
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('uses the variable when it is set, and writes nothing', () => {
    const token = resolveLocalToken({ envToken: 'from-the-environment-1234', dataFolder: folder });

    expect(token).toBe('from-the-environment-1234');
    expect(() => readFileSync(join(folder, LOCAL_TOKEN_FILE_NAME))).toThrow();
  });

  it('reads the file of the data folder when there is no variable', () => {
    writeFileSync(join(folder, LOCAL_TOKEN_FILE_NAME), 'saved-token-0123456789\n');

    expect(resolveLocalToken({ envToken: undefined, dataFolder: folder })).toBe(
      'saved-token-0123456789',
    );
  });

  it('generates a random token and saves it, creating the folder if needed', () => {
    const dataFolder = join(folder, 'data');

    const first = resolveLocalToken({ envToken: undefined, dataFolder });
    const second = resolveLocalToken({ envToken: undefined, dataFolder });

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(readFileSync(join(dataFolder, LOCAL_TOKEN_FILE_NAME), 'utf8').trim()).toBe(first);
    expect(second).toBe(first);
  });

  it('generates a new token when the file is empty', () => {
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, LOCAL_TOKEN_FILE_NAME), '  \n');

    const token = resolveLocalToken({ envToken: undefined, dataFolder: folder });

    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});
