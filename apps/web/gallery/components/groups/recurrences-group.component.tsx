import {
  BillRow,
  DateRulePicker,
  ExpectedValueUpdate,
  NeedsAttentionStrip,
  PartialBar,
  RecurrenceList,
  RecurrenceRow,
  RecurrenceStatusChip,
  TotalCard,
  type BillStatus,
  type RecurrenceInlineAction,
  type RecurrenceStatus,
} from '@fincheck/ui';

import { DATE_RULE_OPTIONS, TOTAL_ITEMS } from '../../constants/sample-planning.constant.ts';
import type { GallerySectionDef } from '../../types/gallery-group.type.ts';
import { GalleryVariant } from '../shell/gallery-variant.component.tsx';
import { State } from '../shell/state.component.tsx';

const noop = () => undefined;

const STATUSES: RecurrenceStatus[] = [
  'expected',
  'received',
  'partial',
  'late',
  'different',
  'dismissed',
  'paid-unlinked',
];
const BILL_STATUSES: BillStatus[] = ['open', 'late', 'partial', 'settled', 'paid-unlinked'];
const INLINE: RecurrenceInlineAction[] = ['mark-done', 'link', 'edit-expected'];

const STATUS_NOTE: Record<RecurrenceStatus, string> = {
  expected: 'Em 3 dias',
  received: 'Recebido 07/10',
  partial: 'Recebido 425,00',
  late: 'Atrasado 2 dias',
  different: 'Esperado 21,90',
  dismissed: 'Dispensada em outubro',
  'paid-unlinked': 'Pago em 20/10',
};

export const RECURRENCES_SECTIONS: GallerySectionDef[] = [
  {
    id: 'recurrence-row',
    title: 'RecurrenceRow e RecurrenceStatusChip',
    content: (
      <>
        <GalleryVariant caption="um por estado (despesa)" width={820}>
          <RecurrenceList>
            {STATUSES.map((status) => (
              <RecurrenceRow
                key={status}
                name="Internet Fibra Norte"
                icon="wifi"
                flow="expense"
                rule="Todo dia 20"
                account="Banco Aurora, crédito"
                status={status}
                statusNote={STATUS_NOTE[status]}
                amountCents={status === 'partial' ? 42500 : 11990}
                totalCents={status === 'partial' ? 85000 : undefined}
                onAction={noop}
              />
            ))}
          </RecurrenceList>
        </GalleryVariant>
        <GalleryVariant caption="receita, com ações inline" width={820}>
          <RecurrenceList>
            <RecurrenceRow
              name="Vale Verde (salário)"
              icon="salary"
              flow="income"
              rule="Até o 5º dia útil"
              account="Pix de Vale Verde"
              status="late"
              statusNote="Atrasado 2 dias"
              amountCents={420000}
              inlineActions={INLINE}
              onAction={noop}
            />
          </RecurrenceList>
        </GalleryVariant>
        <GalleryVariant caption="RecurrenceStatusChip">
          <div className="flex flex-wrap gap-s8">
            {STATUSES.map((status) => (
              <RecurrenceStatusChip key={status} status={status} />
            ))}
          </div>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'needs-attention',
    title: 'NeedsAttentionStrip e ExpectedValueUpdate',
    content: (
      <>
        <GalleryVariant caption="faixa com linhas e atualização de valor" width={820}>
          <NeedsAttentionStrip countLabel="2 recorrências">
            <RecurrenceRow
              name="Streaming Lume"
              icon="subscription"
              flow="expense"
              rule="Todo dia 22"
              status="different"
              statusNote="Esperado 21,90"
              amountCents={2390}
              onAction={noop}
            />
            <ExpectedValueUpdate newCents={2390} keptCents={2190} onUpdate={noop} onKeep={noop} />
            <RecurrenceRow
              name="Vale Verde (salário)"
              icon="salary"
              flow="income"
              rule="Até o 5º dia útil"
              status="late"
              statusNote="Atrasado 2 dias"
              amountCents={420000}
              inlineActions={INLINE}
              onAction={noop}
            />
          </NeedsAttentionStrip>
        </GalleryVariant>
        <GalleryVariant caption="ExpectedValueUpdate solto" width={520}>
          <ExpectedValueUpdate newCents={2390} keptCents={2190} onUpdate={noop} onKeep={noop} />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'bill-row',
    title: 'BillRow',
    content: (
      <>
        {BILL_STATUSES.map((status) => (
          <GalleryVariant key={status} caption={status} width={820}>
            <ul className="m-0 list-none p-0">
              <BillRow
                name="Aluguel"
                icon="house"
                flow="expense"
                status={status}
                badges={[{ label: 'Recorrente', tone: 'accent' }]}
                dueText={status === 'settled' ? 'Paga em 28/09' : 'Vence 25/10, em 3 dias'}
                amountCents={180000}
                settledCents={status === 'partial' ? 90000 : undefined}
                onAction={status === 'settled' ? undefined : noop}
              />
            </ul>
          </GalleryVariant>
        ))}
        <GalleryVariant caption="receita (dívida de amigo, parcial)" width={820}>
          <ul className="m-0 list-none p-0">
            <BillRow
              name="Rafa Mendonça"
              icon="debt"
              flow="income"
              status="partial"
              badges={[{ label: 'Dívida', tone: 'warn', icon: 'hand-money' }]}
              dueText="Combinado para 30/10"
              amountCents={30000}
              settledCents={15000}
              onAction={noop}
            />
          </ul>
        </GalleryVariant>
        <GalleryVariant caption="fatura com pagamento encontrado" width={820}>
          <ul className="m-0 list-none p-0">
            <BillRow
              name="Fatura Banco Aurora"
              icon="card"
              flow="expense"
              status="open"
              badges={[{ label: 'Fatura' }]}
              dueText="Vence 06/11"
              foundPayment="Pagamento encontrado no Banco Aurora"
              amountCents={295000}
              onAction={noop}
            />
          </ul>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'partial-bar',
    title: 'PartialBar e TotalCard',
    content: (
      <>
        <GalleryVariant caption="PartialBar 0 / 50 / 100%">
          <div className="flex flex-col gap-s8">
            <PartialBar paidCents={0} totalCents={10000} label="Recebido da mesada" />
            <PartialBar paidCents={5000} totalCents={10000} label="Recebido da mesada" />
            <PartialBar paidCents={10000} totalCents={10000} label="Recebido da mesada" />
          </div>
        </GalleryVariant>
        <GalleryVariant caption="TotalCard simples" width={300}>
          <TotalCard label="Receitas esperadas em outubro" totalCents={450000} caption="2 fontes" />
        </GalleryVariant>
        <GalleryVariant caption="TotalCard com composição" width={300}>
          <TotalCard
            label="A pagar"
            totalCents={290420}
            caption="3 contas, até 31/10 e faturas abertas"
            items={TOTAL_ITEMS}
            totalLabel="Total a pagar"
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'date-rule-picker',
    title: 'DateRulePicker',
    content: (
      <>
        <State initial="fixed">
          {(value, set) => (
            <GalleryVariant caption="com prévia das próximas datas" width={520}>
              <DateRulePicker
                label="Regra de data"
                options={DATE_RULE_OPTIONS}
                value={value}
                onChange={set}
                preview={['qui, 20/11', 'dom, 20/12', 'qua, 20/01']}
                previewLabel="Próximas datas"
              />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="sem prévia, segunda opção" width={520}>
          <DateRulePicker
            label="Regra de data"
            options={DATE_RULE_OPTIONS}
            value="business"
            onChange={noop}
          />
        </GalleryVariant>
      </>
    ),
  },
];
