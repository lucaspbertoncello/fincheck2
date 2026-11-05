import {
  BillRow,
  Button,
  CategoryIcon,
  Chip,
  ListRow,
  Money,
  OverflowMenu,
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

import { DATE_RULE_OPTIONS, TOTAL_ITEMS } from '#gallery/constants/sample-planning.constant.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import { State } from '#gallery/components/shell/state.component.tsx';

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

const MENU = (
  <OverflowMenu label="Ações" items={[{ key: 'edit', label: 'Editar' }]} onAction={noop} />
);

function NeedsAttentionSample() {
  return (
    <NeedsAttentionStrip countLabel="2 recorrências">
      <RecurrenceRow
        name="Streaming Lume"
        icon="subscription"
        flow="expense"
        rule="Todo dia 22"
        status="different"
        statusNote="Cobrado R$ 23,90, R$ 2,00 a mais"
        amountCents={2390}
        detailMode="reason"
        decision={
          <ExpectedValueUpdate newCents={2390} keptCents={2190} onUpdate={noop} onKeep={noop} />
        }
        onAction={noop}
      />
      <RecurrenceRow
        name="Vale Verde (salário)"
        icon="salary"
        flow="income"
        rule="Até o 5º dia útil"
        status="late"
        statusNote="Venceu 20/10, sem pagamento ligado"
        amountCents={420000}
        detailMode="reason"
        inlineActions={INLINE}
        onAction={noop}
      />
    </NeedsAttentionStrip>
  );
}

function InvoiceSample() {
  return (
    <ul className="m-0 list-none p-0">
      <BillRow
        name="Fatura Bradesco Black"
        icon="card"
        flow="expense"
        status="paid-unlinked"
        badges={[{ label: 'Fatura' }]}
        dueText="Vence 28/10"
        foundPayment="Pagamento encontrado no Bradesco"
        amountCents={128490}
        onAction={noop}
      />
    </ul>
  );
}

export const RECURRENCES_SECTIONS: GallerySectionDef[] = [
  {
    id: 'list-row',
    title: 'ListRow (linha de lista padrão)',
    content: (
      <>
        <GalleryVariant
          caption="ícone, nome e detalhe, valor na ponta, menu, faixa de ações; valor composto em duas linhas"
          width={820}
        >
          <ul className="m-0 list-none divide-y divide-line p-0">
            <ListRow
              mark={<CategoryIcon icon="wifi" type="expense" />}
              name="Internet Fibra Norte"
              detail="Em 3 dias · Todo dia 20 · Banco Aurora, crédito"
              badges={[<Chip key="s">Esperado</Chip>]}
              value={
                <Money
                  cents={11990}
                  sign="minus"
                  signColumn
                  weight="plain"
                  className="text-money-row"
                />
              }
              menu={MENU}
              actions={
                <Button size="sm" variant="secondary" onPress={noop}>
                  Marcar como paga
                </Button>
              }
            />
            <ListRow
              mark={<CategoryIcon icon="salary" type="income" />}
              name="Mesada"
              detail="1 recebimento, o último em 07/10 · Qualquer dia"
              badges={[
                <Chip key="s" tone="accent">
                  Parcial
                </Chip>,
              ]}
              value={
                <Money
                  cents={40000}
                  sign="plus"
                  signColumn
                  weight="plain"
                  tone="income"
                  className="text-money-row"
                />
              }
              valueNote={
                <>
                  de <Money cents={80000} sign="none" weight="plain" className="text-meta" />
                </>
              }
              menu={MENU}
            />
          </ul>
        </GalleryVariant>
        <GalleryVariant
          caption="375: a mesma linha, nome longo truncado com title, dois selos"
          width={375}
        >
          <ul className="m-0 list-none p-0">
            <ListRow
              mark={<CategoryIcon icon="house" type="expense" />}
              name="Mensalidade do curso de especialização em dados"
              detail="Venceu 20/10, sem pagamento ligado · Todo dia 20 · Banco Aurora"
              badges={[
                <Chip key="a" tone="warn" icon="warning">
                  Atrasado
                </Chip>,
                <Chip key="b">Recorrente</Chip>,
              ]}
              value={
                <Money
                  cents={128490}
                  sign="minus"
                  signColumn
                  weight="plain"
                  className="text-money-row"
                />
              }
              menu={MENU}
              actions={
                <>
                  <Button size="sm" variant="secondary" onPress={noop}>
                    Marcar como paga
                  </Button>
                  <Button size="sm" variant="secondary" onPress={noop}>
                    Vincular transação
                  </Button>
                </>
              }
            />
          </ul>
        </GalleryVariant>
      </>
    ),
  },
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
        <GalleryVariant caption="faixa com decisão na faixa de ações (1280)" width={820}>
          <NeedsAttentionSample />
        </GalleryVariant>
        <GalleryVariant caption="a mesma faixa a 375" width={375}>
          <NeedsAttentionSample />
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
        <GalleryVariant
          caption="fatura paga, falta vincular, pagamento encontrado: dois selos e o resto na linha de detalhe"
          width={820}
        >
          <InvoiceSample />
        </GalleryVariant>
        <GalleryVariant caption="a mesma fatura a 375" width={375}>
          <InvoiceSample />
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
