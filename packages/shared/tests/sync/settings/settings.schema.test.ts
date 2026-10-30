import { describe, expect, it } from 'vitest';

import {
  saveSyncSettingsRequestSchema,
  syncSettingsDtoSchema,
} from '#/sync/settings/settings.schema.ts';

describe('saveSyncSettingsRequestSchema', () => {
  it('trims the keys and keeps their sizes', () => {
    expect(
      saveSyncSettingsRequestSchema.parse({ clientId: ' id ', clientSecret: ' secret ' }),
    ).toEqual({
      clientId: 'id',
      clientSecret: 'secret',
    });
    expect(
      saveSyncSettingsRequestSchema.safeParse({ clientId: '', clientSecret: 'secret' }).success,
    ).toBe(false);
    expect(
      saveSyncSettingsRequestSchema.safeParse({ clientId: 'id', clientSecret: 'x'.repeat(201) })
        .success,
    ).toBe(false);
  });
});

describe('syncSettingsDtoSchema', () => {
  it('never carries the secret', () => {
    const parsed = syncSettingsDtoSchema.parse({
      configured: true,
      clientId: 'id',
      updatedAt: '2026-10-22T13:05:00.000Z',
      clientSecret: 'leak',
    });
    expect(parsed).not.toHaveProperty('clientSecret');
  });
});
