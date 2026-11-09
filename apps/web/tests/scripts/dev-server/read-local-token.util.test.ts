import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readLocalToken } from '#scripts/dev-server/read-local-token.util.ts';

describe('readLocalToken', () => {
  let apiFolder: string;

  beforeEach(() => {
    apiFolder = mkdtempSync(join(tmpdir(), 'fincheck-token-'));
  });
  afterEach(() => rmSync(apiFolder, { recursive: true, force: true }));

  function writeTokenFile(folder: string, content: string): void {
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'local-token'), content);
  }

  it('prefers LOCAL_TOKEN over the file', () => {
    writeTokenFile(join(apiFolder, 'data'), 'from-file\n');

    expect(readLocalToken(apiFolder, { LOCAL_TOKEN: 'from-env-0123456789' })).toBe(
      'from-env-0123456789',
    );
  });

  it('reads the file in the default data folder, trimmed', () => {
    writeTokenFile(join(apiFolder, 'data'), 'abc123\n');

    expect(readLocalToken(apiFolder, {})).toBe('abc123');
  });

  it('follows DATABASE_FILE, relative to the API folder', () => {
    writeTokenFile(join(apiFolder, 'other'), 'relative-token\n');

    expect(readLocalToken(apiFolder, { DATABASE_FILE: 'other/app.db' })).toBe('relative-token');
  });

  it('follows an absolute DATABASE_FILE', () => {
    const elsewhere = mkdtempSync(join(tmpdir(), 'fincheck-token-abs-'));
    try {
      writeTokenFile(elsewhere, 'absolute-token');

      expect(readLocalToken(apiFolder, { DATABASE_FILE: join(elsewhere, 'x.db') })).toBe(
        'absolute-token',
      );
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it('is undefined while the file does not exist, then finds it once it appears', () => {
    expect(readLocalToken(apiFolder, {})).toBeUndefined();

    writeTokenFile(join(apiFolder, 'data'), 'late-token\n');

    expect(readLocalToken(apiFolder, {})).toBe('late-token');
  });

  it('is undefined for an empty file', () => {
    writeTokenFile(join(apiFolder, 'data'), '  \n');

    expect(readLocalToken(apiFolder, {})).toBeUndefined();
  });
});
