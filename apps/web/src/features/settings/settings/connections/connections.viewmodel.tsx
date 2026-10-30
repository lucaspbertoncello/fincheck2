import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';
import { saveSyncSettingsRequestSchema } from '@fincheck/shared/sync/settings/settings.schema.ts';
import { resolveBankThemeKey } from '@fincheck/ui';
import { useEffect, useState } from 'react';

import { CONNECTION_ERROR_REASON } from '#/features/settings/settings/connections/constants/connection-error-reason.constant.ts';
import { useConnectionsModel } from '#/features/settings/settings/connections/connections.model.ts';
import { ConnectionsView } from '#/features/settings/settings/connections/connections.view.tsx';
import type {
  ConnectionItem,
  PendingMatchItem,
} from '#/features/settings/settings/connections/types/connection-item.type.ts';
import { describeAccountCandidate } from '#/features/settings/settings/connections/utils/describe-account-candidate.util.ts';
import { formatTimeAgo } from '#/features/settings/settings/connections/utils/format-time-ago.util.ts';
import { focusFirstInvalid } from '#/features/settings/settings/utils/focus-first-invalid.util.ts';
import { getActionErrorMessage } from '#/features/settings/settings/utils/get-action-error-message.util.ts';

type SetupErrors = { clientId?: string; clientSecret?: string };

function toPendingMatches(connection: Connection.Dto): PendingMatchItem[] {
  return connection.pendingAccountMatches.map((match) => ({
    pluggyAccountId: match.pluggyAccountId,
    title: match.numberHint ? `${match.name} final ${match.numberHint}` : match.name,
    choices: match.candidates.map((candidate) => ({
      accountId: candidate.accountId,
      label: describeAccountCandidate(candidate),
    })),
  }));
}

function toItem(connection: Connection.Dto, now: Date): ConnectionItem {
  const isError = connection.status === 'error';
  const history = connection.history;

  return {
    id: connection.id,
    name: connection.institutionName,
    bankTheme: resolveBankThemeKey(connection.institutionCode),
    status: isError ? 'error' : 'active',
    updateLine: connection.lastBankUpdateAt
      ? `Atualizado pelo Pluggy ${formatTimeAgo(connection.lastBankUpdateAt, now)}`
      : 'Ainda sem dados do banco',
    errorReason:
      isError && connection.errorCode ? CONNECTION_ERROR_REASON[connection.errorCode] : null,
    isStale: !isError && connection.isStale,
    historyLine:
      history.status === 'done'
        ? null
        : `Buscando o histórico (${history.transactionCount} transações)`,
    pendingMatches: toPendingMatches(connection),
  };
}

/** Adapts the connections and the Pluggy keys to the section: states, dialog, choices, form. */
export function ConnectionsViewModel() {
  const { settings, connections, disconnect, resolveMatches, saveSettings } = useConnectionsModel();

  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [choices, setChoices] = useState<Record<string, string | null>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [setupErrors, setSetupErrors] = useState<SetupErrors>({});

  useEffect(() => {
    if (Object.keys(setupErrors).length > 0) focusFirstInvalid();
  }, [setupErrors]);

  const now = new Date();
  const items = (connections.data?.items ?? [])
    .filter((connection) => connection.status !== 'disconnected')
    .map((connection) => toItem(connection, now));

  function confirmDisconnect() {
    if (!target) return;
    setActionError(null);
    disconnect.mutate(target.id, {
      onSuccess: () => setTarget(null),
      onError: (error) => {
        setTarget(null);
        setActionError(
          getActionErrorMessage(error, `Não deu para desconectar o ${target.name}. Tente de novo.`),
        );
      },
    });
  }

  function confirmMatches(connectionId: string) {
    const item = items.find((entry) => entry.id === connectionId);
    if (!item) return;
    setActionError(null);
    resolveMatches.mutate(
      {
        id: connectionId,
        body: {
          matches: item.pendingMatches.map((match) => ({
            pluggyAccountId: match.pluggyAccountId,
            accountId: choices[match.pluggyAccountId] ?? null,
          })),
        },
      },
      {
        onError: (error) =>
          setActionError(getActionErrorMessage(error, 'Não deu para salvar a escolha.')),
      },
    );
  }

  function submitSetup() {
    const parsed = saveSyncSettingsRequestSchema.safeParse({ clientId, clientSecret });
    if (!parsed.success) {
      const errors: SetupErrors = {};
      if (parsed.error.issues.some((issue) => issue.path[0] === 'clientId')) {
        errors.clientId = 'Cole o Client ID do Pluggy.';
      }
      if (parsed.error.issues.some((issue) => issue.path[0] === 'clientSecret')) {
        errors.clientSecret = 'Cole o Client Secret do Pluggy.';
      }
      setSetupErrors(errors);
      return;
    }

    setSetupErrors({});
    setActionError(null);
    saveSettings.mutate(parsed.data, {
      onSuccess: () => setClientSecret(''),
      onError: (error) =>
        setActionError(getActionErrorMessage(error, 'Não deu para guardar as chaves.')),
    });
  }

  const isLoading = settings.isPending || connections.isPending;
  const isError = settings.isError || connections.isError;

  return (
    <ConnectionsView
      state={
        isLoading ? 'loading' : isError ? 'error' : settings.data?.configured ? 'ready' : 'setup'
      }
      items={items}
      actionError={actionError}
      onRetry={() => {
        void settings.refetch();
        void connections.refetch();
      }}
      disconnectingName={target?.name ?? null}
      isDisconnecting={disconnect.isPending}
      onAskDisconnect={(id) => {
        const item = items.find((entry) => entry.id === id);
        if (item) setTarget({ id, name: item.name });
      }}
      onCancelDisconnect={() => setTarget(null)}
      onConfirmDisconnect={confirmDisconnect}
      choices={choices}
      onChoose={(pluggyAccountId, accountId) =>
        setChoices((current) => ({ ...current, [pluggyAccountId]: accountId }))
      }
      isSavingMatches={resolveMatches.isPending}
      onConfirmMatches={confirmMatches}
      setup={{
        clientId,
        clientSecret,
        errors: setupErrors,
        isSaving: saveSettings.isPending,
        onClientIdChange: setClientId,
        onClientSecretChange: setClientSecret,
        onSubmit: submitSetup,
      }}
    />
  );
}
