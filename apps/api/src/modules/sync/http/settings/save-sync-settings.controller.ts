import type { SyncSettings } from '@fincheck/shared/sync/settings/settings.type.ts';

import type { SaveSyncSettingsUseCase } from '#/modules/sync/application/settings/save-sync-settings.usecase.ts';

export class SaveSyncSettingsController {
  private readonly saveSettings: SaveSyncSettingsUseCase;

  constructor(saveSettings: SaveSyncSettingsUseCase) {
    this.saveSettings = saveSettings;
  }

  async handle(
    request: SaveSyncSettingsController.Request,
  ): Promise<SaveSyncSettingsController.Response> {
    return this.saveSettings.execute(request.body);
  }
}

export namespace SaveSyncSettingsController {
  export type Request = { body: SyncSettings.SaveRequest };
  export type Response = SyncSettings.Dto;
}
