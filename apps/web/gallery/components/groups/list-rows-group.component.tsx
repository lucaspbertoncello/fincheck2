import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import type { ReactNode } from 'react';

import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { IncomeSourceRow } from '#/features/profile/profile/components/income-source-row.component.tsx';
import { SubscriptionRow } from '#/features/recurrences/subscription-list/components/subscription-row.component.tsx';
import type { SubscriptionRowData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';
import { BackupFileRow } from '#/features/settings/settings/backup/components/backup-file-row.component.tsx';
import { ConnectionCard } from '#/features/settings/settings/connections/components/connection-card.component.tsx';
import { PendingMatches } from '#/features/settings/settings/connections/components/pending-matches.component.tsx';
import type { ConnectionItem } from '#/features/settings/settings/connections/types/connection-item.type.ts';

const noop = () => undefined;

const WIDTHS = [820, 375] as const;

const INCOME_SOURCES: Profile.IncomeSource[] = [
  {
    recurrenceId: 'is-1',
    name: 'Salário Alvorada',
    counterparty: 'Alvorada Tecnologia Ltda',
    employmentRegime: 'clt',
    expectedAmountCents: 850000,
    amountMode: 'fixed',
    dateRule: {
      type: 'business_day',
      day: null,
      businessDayNumber: 5,
      toleranceDays: null,
      nonBusinessDayShift: null,
    },
    accountId: null,
    nextExpectedOn: '2026-12-07',
  },
  {
    recurrenceId: 'is-2',
    name: 'Freelas de design e consultoria de identidade visual',
    counterparty: null,
    employmentRegime: null,
    expectedAmountCents: 120050,
    amountMode: 'last_received',
    dateRule: {
      type: 'fixed_day',
      day: 20,
      businessDayNumber: null,
      toleranceDays: null,
      nonBusinessDayShift: 'none',
    },
    accountId: null,
    nextExpectedOn: null,
  },
];

const CONNECTIONS: ConnectionItem[] = [
  {
    id: 'cn-1',
    name: 'Nubank',
    bankTheme: 'nubank',
    status: 'active',
    updateLine: 'Atualizado pelo banco há 12 min',
    errorReason: null,
    isStale: false,
    historyLine: null,
    accounts: [
      { id: 'ac-n1', name: 'Nubank', kindLabel: 'Conta corrente', icon: 'wallet' },
      { id: 'ac-n2', name: 'Nubank', kindLabel: 'Cartão de crédito', icon: 'card' },
    ],
    pendingMatches: [],
  },
  {
    id: 'cn-2',
    name: 'Banco do Brasil',
    bankTheme: 'banco-do-brasil',
    status: 'error',
    updateLine: null,
    errorReason: 'login com erro',
    isStale: true,
    historyLine: null,
    accounts: [{ id: 'ac-b1', name: 'Conta BB', kindLabel: 'Poupança', icon: 'coins' }],
    pendingMatches: [],
  },
  {
    id: 'cn-3',
    name: 'Bradesco',
    bankTheme: 'bradesco',
    status: 'active',
    updateLine: 'Atualizado pelo banco há 3 min',
    errorReason: null,
    isStale: false,
    historyLine: 'Buscando o histórico (120 transações)',
    accounts: [],
    pendingMatches: [
      {
        pluggyAccountId: 'pa-1',
        title: 'Conta corrente final 1234',
        choices: [
          { accountId: 'ac-1', label: 'Bradesco, conta corrente' },
          { accountId: 'ac-2', label: 'Bradesco, poupança' },
        ],
      },
    ],
  },
];

const SUBSCRIPTIONS: SubscriptionRowData[] = [
  {
    recurrenceId: 'sb-1',
    name: 'Streaming Plus',
    icon: 'wifi',
    service: null,
    detail: 'Roxinho · dia 12',
    status: 'charged',
    ended: false,
    amountCents: 3990,
    statusNote: 'Cobrada 05/11',
    alert: null,
    pending: false,
  },
  {
    recurrenceId: 'sb-logo',
    name: 'Netflix',
    icon: 'wifi',
    service: { name: 'Netflix', slug: 'netflix' },
    detail: 'Roxinho · dia 14',
    status: 'charged',
    ended: false,
    amountCents: 5590,
    statusNote: 'Cobrada 14/10',
    alert: null,
    pending: false,
  },
  {
    recurrenceId: 'sb-initial',
    name: 'Clube do livro',
    icon: 'book',
    service: null,
    detail: 'Roxinho · dia 16',
    status: 'upcoming',
    ended: false,
    amountCents: 3390,
    statusNote: 'Em 3 dias',
    alert: null,
    pending: false,
  },
  {
    recurrenceId: 'sb-2',
    name: 'Armazenamento em nuvem com nome bem comprido para testar',
    icon: 'book',
    service: null,
    detail: 'Roxinho · dia 20',
    status: 'charged',
    ended: false,
    amountCents: 2390,
    statusNote: 'Cobrada 20/10',
    alert: {
      kind: 'price_changed',
      text: 'Cobrou R$ 23,90, R$ 2,00 a mais que o esperado.',
      actionLabel: 'Atualizar valor',
    },
    pending: false,
  },
  {
    recurrenceId: 'sb-3',
    name: 'Academia',
    icon: 'gym',
    service: null,
    detail: 'Roxinho · dia 8',
    status: 'missed',
    ended: true,
    amountCents: 11990,
    statusNote: 'Não cobrou',
    alert: { kind: 'missed', text: 'Não cobrou este mês.', actionLabel: 'Encerrar' },
    pending: false,
  },
];

const BACKUPS = [
  { fileName: 'a.bak', moment: 'Ontem às 03:00', size: '14,2 MB', day: '04/11', isLatest: true },
  {
    fileName: 'b.bak',
    moment: 'Terça, 28/10 às 03:00',
    size: '14,0 MB',
    day: '28/10',
    isLatest: false,
  },
];

function Rows({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-none p-0">{children}</ul>;
}

/** The rows of Perfil, Backup, Conexões and Assinaturas on the standard list row, at 820 and 375. */
export const LIST_ROWS_SECTIONS: GallerySectionDef[] = [
  {
    id: 'list-rows-profile',
    title: 'Fonte de renda (Perfil)',
    content: (
      <>
        {WIDTHS.map((width) => (
          <GalleryVariant key={width} caption={String(width)} width={width}>
            <Rows>
              {INCOME_SOURCES.map((source) => (
                <IncomeSourceRow key={source.recurrenceId} source={source} onEdit={noop} />
              ))}
            </Rows>
          </GalleryVariant>
        ))}
      </>
    ),
  },
  {
    id: 'list-rows-backup',
    title: 'Backup (Configurações)',
    content: (
      <>
        {WIDTHS.map((width) => (
          <GalleryVariant key={width} caption={String(width)} width={width}>
            <Rows>
              {BACKUPS.map((file) => (
                <BackupFileRow
                  key={file.fileName}
                  file={file}
                  isDisabled={false}
                  onRestore={noop}
                />
              ))}
            </Rows>
          </GalleryVariant>
        ))}
      </>
    ),
  },
  {
    id: 'list-rows-connections',
    title: 'Conexões (Configurações)',
    content: (
      <>
        {WIDTHS.map((width) => (
          <GalleryVariant
            key={width}
            caption={`${width}: ativa, com erro, pendência`}
            width={width}
          >
            <ul className="m-0 flex list-none flex-col gap-s16 p-0">
              {CONNECTIONS.map((item) => (
                <ConnectionCard
                  key={item.id}
                  item={item}
                  onDisconnect={noop}
                  pending={
                    item.pendingMatches.length > 0 ? (
                      <PendingMatches
                        bankName={item.name}
                        matches={item.pendingMatches}
                        choices={{}}
                        onChoose={noop}
                        isSaving={false}
                        onConfirm={noop}
                      />
                    ) : undefined
                  }
                />
              ))}
            </ul>
          </GalleryVariant>
        ))}
      </>
    ),
  },
  {
    id: 'list-rows-subscriptions',
    title: 'Assinatura',
    content: (
      <>
        {WIDTHS.map((width) => (
          <GalleryVariant
            key={width}
            caption={`${width}: cobrada, aviso de valor, encerrada`}
            width={width}
          >
            {SUBSCRIPTIONS.map((row, index) => (
              <SubscriptionRow
                key={row.recurrenceId}
                row={row}
                first={index === 0}
                onAction={noop}
              />
            ))}
          </GalleryVariant>
        ))}
      </>
    ),
  },
];
