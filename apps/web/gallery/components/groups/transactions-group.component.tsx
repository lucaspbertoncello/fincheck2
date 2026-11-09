import {
  BankChangedNotice,
  BankDifferenceBox,
  CategoryChoices,
  CategoryGroup,
  CategoryGroupList,
  CategorySuggestion,
  EditDateField,
  OriginalFromBankNote,
  SelectionBar,
  SelectionToggle,
  SplitSumIndicator,
  TagPicker,
  TransactionDayGroup,
  TransactionDayList,
  TransactionDetailBox,
  TransactionRow,
} from '@fincheck/ui';

import {
  CATEGORY_GROUP_SAMPLES,
  ROW_SAMPLES,
  SAMPLE_CATEGORIES,
} from '#gallery/constants/sample-transactions.constant.ts';
import { checkSplit } from '#/domain/transactions/transaction-split/rules/check-split.rule.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import { State } from '#gallery/components/shell/state.component.tsx';

const SAMPLE_TAG_OPTIONS = [
  { id: 'feira', name: 'feira' },
  { id: 'mes', name: 'compra do mês' },
  { id: 'promo', name: 'promoção' },
];

const noop = () => undefined;
const FIRST_ROW = ROW_SAMPLES[0]!.row;

function RowStack({ children }: { children: React.ReactNode }) {
  return <ul className="m-0 flex list-none flex-col p-0">{children}</ul>;
}

function splitIndicatorProps(totalCents: number, partsCents: number[]) {
  const { status, differenceCents } = checkSplit(totalCents, partsCents);
  return { status, differenceCents };
}

export const TRANSACTIONS_SECTIONS: GallerySectionDef[] = [
  {
    id: 'transaction-row',
    title: 'TransactionRow',
    content: (
      <>
        {ROW_SAMPLES.map(({ caption, row }) => (
          <GalleryVariant key={row.id} caption={caption} width={760}>
            <RowStack>
              <TransactionRow transaction={row} onMenuAction={noop} />
            </RowStack>
          </GalleryVariant>
        ))}
        <State<Record<string, boolean>> initial={{}}>
          {(selected, set) => (
            <GalleryVariant caption="modo seleção (clique para marcar)" width={760}>
              <RowStack>
                {ROW_SAMPLES.slice(0, 3).map(({ row }) => (
                  <TransactionRow
                    key={row.id}
                    transaction={row}
                    selectionMode
                    selected={selected[row.id] ?? false}
                    onSelectedChange={(id, value) => set({ ...selected, [id]: value })}
                  />
                ))}
              </RowStack>
            </GalleryVariant>
          )}
        </State>
      </>
    ),
  },
  {
    id: 'detail-boxes',
    title: 'Caixas de detalhe da linha',
    content: (
      <>
        <GalleryVariant caption="TransactionDetailBox neutral e warn" width={760}>
          <RowStack>
            <TransactionRow transaction={FIRST_ROW}>
              <TransactionDetailBox>Caixa neutra sob a linha.</TransactionDetailBox>
              <TransactionDetailBox tone="warn">Caixa de aviso sob a linha.</TransactionDetailBox>
            </TransactionRow>
          </RowStack>
        </GalleryVariant>
        <GalleryVariant caption="BankChangedNotice" width={760}>
          <RowStack>
            <TransactionRow transaction={FIRST_ROW}>
              <BankChangedNotice
                previousCents={3890}
                currentCents={4290}
                onUseBank={noop}
                onKeepMine={noop}
                onShowDifference={noop}
              />
            </TransactionRow>
          </RowStack>
        </GalleryVariant>
        <GalleryVariant caption="BankDifferenceBox" width={760}>
          <RowStack>
            <TransactionRow transaction={FIRST_ROW}>
              <BankDifferenceBox
                bankName="PADARIA ESTRELA"
                bankCents={6890}
                yourName="Padaria Estrela do Sul"
                yourCents={3890}
                note="Valor corrigido: R$ 30,00 eram do lava-rápido."
                onRestoreOriginal={noop}
              />
            </TransactionRow>
          </RowStack>
        </GalleryVariant>
        <GalleryVariant caption="CategorySuggestion" width={760}>
          <RowStack>
            <TransactionRow transaction={ROW_SAMPLES[4]!.row}>
              <CategorySuggestion
                suggestion={SAMPLE_CATEGORIES[0]!}
                onAccept={noop}
                onChooseOther={noop}
              />
            </TransactionRow>
          </RowStack>
        </GalleryVariant>
        <GalleryVariant caption="Caixas no modo seleção (deslocadas)" width={760}>
          <RowStack>
            <TransactionRow transaction={FIRST_ROW} selectionMode>
              <BankChangedNotice
                previousCents={3890}
                currentCents={4290}
                onUseBank={noop}
                onKeepMine={noop}
                onShowDifference={noop}
                selectionMode
              />
            </TransactionRow>
          </RowStack>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'day-group',
    title: 'TransactionDayGroup e TransactionDayList',
    content: (
      <GalleryVariant caption="dois dias, com linhas" width={760}>
        <TransactionDayList>
          <TransactionDayGroup title="Hoje" dateLabel="22 de outubro" count={2} totalCents={-16880}>
            {ROW_SAMPLES.slice(0, 2).map(({ row }) => (
              <TransactionRow key={row.id} transaction={row} />
            ))}
          </TransactionDayGroup>
          <TransactionDayGroup title="Ontem" dateLabel="21 de outubro" count={1} totalCents={-3890}>
            <TransactionRow transaction={FIRST_ROW} />
          </TransactionDayGroup>
        </TransactionDayList>
      </GalleryVariant>
    ),
  },
  {
    id: 'category-group',
    title: 'CategoryGroup e CategoryGroupList',
    content: (
      <>
        <State<string | null> initial="grp-delivery">
          {(open, set) => (
            <GalleryVariant caption="despesas, um aberto" width={760}>
              <CategoryGroupList
                title="Despesas"
                subtitle="por categoria"
                count={3}
                noun={{ singular: 'categoria', plural: 'categorias' }}
                totalCents={158050}
                kind="expense"
              >
                {CATEGORY_GROUP_SAMPLES.map((group) => (
                  <CategoryGroup
                    key={group.id}
                    group={group}
                    kind="expense"
                    expanded={open === group.id}
                    onExpandedChange={(value) => set(value ? group.id : null)}
                    onSeeAll={noop}
                    onReview={noop}
                  />
                ))}
              </CategoryGroupList>
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="receitas" width={760}>
          <CategoryGroupList
            title="Receitas"
            subtitle="por fonte"
            count={1}
            noun={{ singular: 'fonte', plural: 'fontes' }}
            totalCents={420000}
            kind="income"
          >
            <CategoryGroup
              group={{
                id: 'grp-salary',
                name: 'Salário',
                icon: 'salary',
                totalCents: 420000,
                sharePercent: 100,
                count: 1,
                variationPercent: 14,
                detail: 'Vale Verde, R$ 4.200,00',
              }}
              kind="income"
              expanded={false}
              onExpandedChange={noop}
            />
          </CategoryGroupList>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'selection',
    title: 'SelectionBar e SelectionToggle',
    content: (
      <>
        <GalleryVariant caption="SelectionBar" width={520}>
          <SelectionBar count={3} onAction={noop} onClose={noop} />
        </GalleryVariant>
        <GalleryVariant caption="SelectionBar com 1" width={520}>
          <SelectionBar count={1} onAction={noop} onClose={noop} />
        </GalleryVariant>
        <State initial={false}>
          {(active, set) => (
            <GalleryVariant caption="SelectionToggle (interativo)" width={200}>
              <SelectionToggle
                active={active}
                count={3}
                onToggle={() => set(!active)}
                className="w-48"
              />
            </GalleryVariant>
          )}
        </State>
      </>
    ),
  },
  {
    id: 'edit-fields',
    title: 'Campos da edição',
    content: (
      <>
        <State<string | null> initial="cat-food">
          {(value, set) => (
            <GalleryVariant caption="CategoryChoices" width={520}>
              <CategoryChoices
                label="Categoria"
                categories={SAMPLE_CATEGORIES}
                value={value}
                onChange={set}
              />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="CategoryChoices com erro e sem seleção" width={520}>
          <CategoryChoices
            label="Categoria"
            categories={SAMPLE_CATEGORIES}
            value={null}
            onChange={noop}
            error="Escolha uma categoria."
          />
        </GalleryVariant>
        <State initial="2026-10-19">
          {(value, set) => (
            <GalleryVariant caption="EditDateField" width={260}>
              <EditDateField label="Data" value={value} onChange={set} />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="EditDateField com erro" width={260}>
          <EditDateField label="Data" value="" onChange={noop} error="Data inválida." />
        </GalleryVariant>
        <State initial={['feira']}>
          {(ids, set) => (
            <GalleryVariant caption="TagPicker (tags da categoria)" width={420}>
              <TagPicker
                label="Tags"
                categoryName="Mercado"
                options={SAMPLE_TAG_OPTIONS}
                selected={SAMPLE_TAG_OPTIONS.filter((tag) => ids.includes(tag.id))}
                onChange={set}
                onCreate={(name) => Promise.resolve(name)}
              />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="TagPicker, categoria sem tags" width={420}>
          <TagPicker
            label="Tags"
            categoryName="Pets"
            options={[]}
            selected={[]}
            onChange={noop}
            onCreate={(name) => Promise.resolve(name)}
          />
        </GalleryVariant>
        <GalleryVariant caption="TagPicker, sem categoria" width={420}>
          <TagPicker
            label="Tags"
            categoryName={null}
            options={[]}
            selected={[]}
            onChange={noop}
            onCreate={(name) => Promise.resolve(name)}
          />
        </GalleryVariant>
        <GalleryVariant caption="TagPicker carregando" width={420}>
          <TagPicker
            label="Tags"
            categoryName="Mercado"
            options={[]}
            selected={[]}
            status="loading"
            onChange={noop}
            onCreate={(name) => Promise.resolve(name)}
          />
        </GalleryVariant>
        <GalleryVariant caption="TagPicker com erro" width={420}>
          <TagPicker
            label="Tags"
            categoryName="Mercado"
            options={[]}
            selected={[]}
            status="error"
            onRetry={noop}
            onChange={noop}
            onCreate={(name) => Promise.resolve(name)}
          />
        </GalleryVariant>
        <GalleryVariant caption="OriginalFromBankNote" width={520}>
          <OriginalFromBankNote
            original={{ description: 'PADARIA ESTRELA', amountCents: 6890 }}
            onRestore={noop}
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'split',
    title: 'SplitSumIndicator',
    content: (
      <>
        <GalleryVariant caption="SplitSumIndicator confere" width={420}>
          <SplitSumIndicator {...splitIndicatorProps(20800, [14000, 6800])} />
        </GalleryVariant>
        <GalleryVariant caption="faltam" width={420}>
          <SplitSumIndicator {...splitIndicatorProps(20800, [14000, 3000])} />
        </GalleryVariant>
        <GalleryVariant caption="passou" width={420}>
          <SplitSumIndicator {...splitIndicatorProps(20800, [14000, 9000])} />
        </GalleryVariant>
      </>
    ),
  },
];
