import type { SyncSettings } from '#/modules/sync/domain/settings/sync-settings.entity.ts';

// The port to the store of the keys of the Pluggy (the single row). `Executor` is the database
// handle: pass the one of a unit of work to read and write inside it.
export interface SyncSettingsRepository<Executor> {
  find(executor?: Executor): Promise<SyncSettings | null>;
  // Creates the row or replaces it.
  save(settings: SyncSettings, executor?: Executor): Promise<void>;
}
