import type { SyncSettings } from '@fincheck/shared/sync/settings/settings.type.ts';

import type { GetSyncSettingsQuery } from '#/modules/sync/application/settings/get-sync-settings.query.ts';

export class GetSyncSettingsController {
  private readonly getSettings: GetSyncSettingsQuery;

  constructor(getSettings: GetSyncSettingsQuery) {
    this.getSettings = getSettings;
  }

  async handle(): Promise<GetSyncSettingsController.Response> {
    return this.getSettings.execute();
  }
}

export namespace GetSyncSettingsController {
  export type Response = SyncSettings.Dto;
}
