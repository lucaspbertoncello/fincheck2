import {
  Button,
  Chip,
  Collapse,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FineNote,
  OkLine,
  Section,
} from '@fincheck/ui';

import type { FolderModalProps } from '#/features/settings/settings/backup/types/folder-modal-props.type.ts';
import { BackupFileRow } from '#/features/settings/settings/backup/components/backup-file-row.component.tsx';
import { BackupStatusBlock } from '#/features/settings/settings/backup/components/backup-status-block.component.tsx';
import { FolderModal } from '#/features/settings/settings/backup/components/folder-modal.component.tsx';
import { FolderRow } from '#/features/settings/settings/backup/components/folder-row.component.tsx';
import type { BackupFileItem } from '#/features/settings/settings/backup/types/backup-file-item.type.ts';
import { SectionError } from '#/features/settings/settings/components/section-error.component.tsx';
import { SectionSkeleton } from '#/features/settings/settings/components/section-skeleton.component.tsx';
import { SettingsPageFrame } from '#/features/settings/settings/components/settings-page-frame.component.tsx';
import { SETTINGS_SECTION } from '#/features/settings/settings/constants/settings-sections.constant.ts';

const PAGE = SETTINGS_SECTION.backup;

type BackupViewProps = {
  state: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  folderPath: string | null;
  /** The last backup that worked; null when there is none. */
  last: { moment: string; size: string } | null;
  /** Why the last attempt failed, when it did. */
  failure: string | null;
  /** "Hoje às 03:00"; null without a folder. */
  nextMoment: string | null;
  keepCount: number;
  /** The sentence under an action that failed (a backup or a restore). */
  actionError: string | null;
  /** Name of the safety copy made by the last restore. */
  safetyCopy: string | null;
  isRunning: boolean;
  onRunBackup: () => void;
  folder: FolderModalProps;
  files: {
    isLoading: boolean;
    isError: boolean;
    /** Every backup of the folder; the first `shortCount` are always shown, the rest open on request. */
    items: BackupFileItem[];
    shortCount: number;
    /** True when the list can grow to every backup of the folder. */
    canExpand: boolean;
    isExpanded: boolean;
    totalCount: number;
    onToggleExpanded: () => void;
    onRetry: () => void;
  };
  restore: {
    /** The backup the person asked to restore: opens the confirmation. */
    target: BackupFileItem | null;
    isRestoring: boolean;
    onAsk: (fileName: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
  };
};

/**
 * "Backup": the last backup (when and whether it worked), the next one, "Fazer backup agora", the
 * folder, the latest backups and the restore. Restoring is the delicate gesture: the button of a
 * row only asks, and the dialog that ends the gesture says what will be replaced.
 */
export function BackupView({
  state,
  onRetry,
  folderPath,
  last,
  failure,
  nextMoment,
  keepCount,
  actionError,
  safetyCopy,
  isRunning,
  onRunBackup,
  folder,
  files,
  restore,
}: BackupViewProps) {
  return (
    <SettingsPageFrame title={PAGE.title} description={PAGE.description}>
      {state === 'loading' ? (
        <Section title="Situação" divider={false}>
          <SectionSkeleton label="Carregando o backup" rows={2} />
        </Section>
      ) : null}
      {state === 'error' ? (
        <ErrorState
          title="Não deu para carregar o estado do backup."
          description="Confira se o app está rodando e tente de novo."
          onRetry={onRetry}
        />
      ) : null}
      {state === 'ready' && folderPath === null ? (
        <EmptyState
          icon="folder"
          title="Escolha a pasta dos backups"
          description="O app guarda uma cópia do banco por dia nela. Pode ser um disco externo ou uma pasta de rede."
          primaryAction={{
            label: 'Escolher pasta',
            icon: 'folder',
            onPress: folder.onStartEditing,
          }}
        />
      ) : null}
      {state === 'ready' && folderPath !== null ? (
        <>
          <Section
            title="Situação"
            divider={false}
            action={
              <Button
                icon="database"
                loading={isRunning}
                loadingLabel="Fazendo backup..."
                className="min-w-48"
                onPress={onRunBackup}
              >
                Fazer backup agora
              </Button>
            }
          >
            <div className="grid gap-s24 sm:grid-cols-2">
              <BackupStatusBlock label="Último backup" value={last?.moment ?? 'Nenhum ainda'}>
                {failure ? (
                  <>
                    <Chip tone="warn" icon="warning">
                      Falhou
                    </Chip>
                    <span>{failure}</span>
                  </>
                ) : last ? (
                  <>
                    <Chip tone="ok" icon="check">
                      Deu certo
                    </Chip>
                    <span className="tabular-nums">{last.size}</span>
                  </>
                ) : (
                  <span>O primeiro sai no próximo horário.</span>
                )}
              </BackupStatusBlock>
              <BackupStatusBlock label="Próximo backup" value={nextMoment ?? 'Sem horário'}>
                <span>Um por dia, os últimos {keepCount} ficam guardados.</span>
              </BackupStatusBlock>
            </div>
            {safetyCopy ? (
              <OkLine>Backup restaurado. A cópia de segurança ficou em {safetyCopy}.</OkLine>
            ) : null}
            <Collapse
              isOpen={Boolean(actionError)}
              trackClassName="-mt-s16"
              contentClassName="pt-s16"
            >
              {actionError ? (
                <p role="alert" className="text-meta text-loss">
                  {actionError}
                </p>
              ) : null}
            </Collapse>
          </Section>

          <Section title="Pasta">
            <FolderRow folderPath={folderPath} onChange={folder.onStartEditing} />
          </Section>

          <Section title="Últimos backups">
            {files.isLoading ? <SectionSkeleton label="Carregando os backups" rows={3} /> : null}
            {files.isError ? (
              <SectionError
                message="Não deu para ler a pasta dos backups."
                onRetry={files.onRetry}
              />
            ) : null}
            {!files.isLoading && !files.isError && files.items.length === 0 ? (
              <p className="text-label text-fg-secondary">Ainda não há backups nessa pasta.</p>
            ) : null}
            {files.items.length > 0 ? (
              <div>
                <ul aria-label="Backups da pasta" className="flex flex-col">
                  {files.items.slice(0, files.shortCount).map((file) => (
                    <BackupFileRow
                      key={file.fileName}
                      file={file}
                      isDisabled={isRunning}
                      onRestore={() => restore.onAsk(file.fileName)}
                    />
                  ))}
                </ul>
                {files.canExpand ? (
                  <Collapse isOpen={files.isExpanded}>
                    <ul aria-label="Demais backups da pasta" className="flex flex-col">
                      {files.items.slice(files.shortCount).map((file) => (
                        <BackupFileRow
                          key={file.fileName}
                          file={file}
                          isDisabled={isRunning}
                          onRestore={() => restore.onAsk(file.fileName)}
                        />
                      ))}
                    </ul>
                  </Collapse>
                ) : null}
              </div>
            ) : null}
            {files.canExpand ? (
              <div>
                <Button
                  variant="tertiary"
                  size="sm"
                  aria-expanded={files.isExpanded}
                  onPress={files.onToggleExpanded}
                >
                  {files.isExpanded
                    ? 'Mostrar só os últimos'
                    : `Mostrar todos (${files.totalCount})`}
                </Button>
              </div>
            ) : null}
            <FineNote icon="shield">
              Restaurar troca o banco de agora pelo do backup. Antes, o app guarda uma cópia do
              estado atual na mesma pasta.
            </FineNote>
          </Section>
        </>
      ) : null}
      <FolderModal {...folder} />
      <ConfirmDialog
        isOpen={restore.target !== null}
        onOpenChange={(open) => {
          if (!open) restore.onCancel();
        }}
        destructive
        icon="history"
        title={`Restaurar o backup de ${restore.target?.day ?? ''}?`}
        description={`O app troca o banco atual pelo de ${restore.target?.moment.toLowerCase() ?? ''}.`}
        changes={[
          { text: 'Antes, o app guarda uma cópia do banco de agora na mesma pasta.' },
          { icon: 'warning', text: 'O que foi lançado depois desse backup deixa de aparecer.' },
          { text: 'O app reabre sozinho com os dados do backup.' },
        ]}
        confirmLabel="Restaurar"
        cancelLabel="Voltar"
        loading={restore.isRestoring}
        onConfirm={restore.onConfirm}
      />
    </SettingsPageFrame>
  );
}
