import type { ConnectToken } from '@fincheck/shared/sync/connect-token/connect-token.type.ts';

import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { translateProviderFailure } from '#/modules/sync/application/provider/translate-provider-failure.util.ts';
import type { CredentialsLoader } from '#/modules/sync/application/settings/credentials-loader.service.ts';
import { SyncNotConfiguredError } from '#/modules/sync/domain/settings/sync-not-configured.error.ts';

// The token the widget of the Pluggy needs to open (step 3 of the setup and "Conectar conta"): good
// for 30 minutes. It authenticates with the keys saved and writes nothing.
export class CreateConnectTokenUseCase {
  private readonly credentials: CredentialsLoader;
  private readonly provider: BankDataProvider;

  constructor(credentials: CredentialsLoader, provider: BankDataProvider) {
    this.credentials = credentials;
    this.provider = provider;
  }

  async execute(): Promise<CreateConnectTokenUseCase.Output> {
    const credentials = await this.credentials.load();
    if (credentials === null) throw new SyncNotConfiguredError();

    try {
      return await this.provider.createConnectToken(credentials);
    } catch (error) {
      throw translateProviderFailure(error);
    }
  }
}

export namespace CreateConnectTokenUseCase {
  export type Output = ConnectToken.Dto;
}
