import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readApiEnv } from '#scripts/dev-server/read-api-env.util.ts';

describe('readApiEnv', () => {
  let apiFolder: string;

  beforeEach(() => {
    apiFolder = mkdtempSync(join(tmpdir(), 'fincheck-env-'));
  });
  afterEach(() => rmSync(apiFolder, { recursive: true, force: true }));

  it('returns the process environment when there is no .env', () => {
    expect(readApiEnv(apiFolder, { API_PORT: '3340' })).toEqual({ API_PORT: '3340' });
  });

  it('reads the .env file and lets the process environment win', () => {
    writeFileSync(join(apiFolder, '.env'), 'API_PORT=4000\nDATABASE_FILE=x/y.db\n');

    expect(readApiEnv(apiFolder, { API_PORT: '3340' })).toEqual({
      API_PORT: '3340',
      DATABASE_FILE: 'x/y.db',
    });
  });
});
