import {
  AmountField,
  Button,
  CategoryPicker,
  ChoiceField,
  DateQuickField,
  EditDateField,
  FormModal,
  FormModalGroup,
  FormModalMore,
  FormModalSplit,
  MoneyField,
  SearchField,
  SelectField,
  TextField,
  type AmountKind,
  type ChoiceOption,
} from '@fincheck/ui';
import { useState } from 'react';

import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { SAMPLE_CATEGORIES } from '#gallery/constants/sample-transactions.constant.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import { State } from '#gallery/components/shell/state.component.tsx';

const noop = () => undefined;

const ACCOUNTS: ChoiceOption[] = [
  { key: 'nubank', label: 'Nubank', icon: 'wallet', hint: 'Conta corrente' },
  { key: 'itau', label: 'Itaú', icon: 'wallet', hint: 'Conta corrente' },
  { key: 'cash', label: 'Carteira', icon: 'coins', hint: 'Dinheiro' },
];

const METHODS: ChoiceOption[] = [
  { key: 'pix', label: 'Pix' },
  { key: 'debit', label: 'Débito' },
  { key: 'credit', label: 'Crédito' },
  { key: 'cash', label: 'Dinheiro' },
];

type TransactionDraft = {
  kind: AmountKind;
  cents: number;
  description: string;
  categoryId: string | null;
  date: string;
  account: string | null;
  method: string | null;
  note: string;
};

const EMPTY_DRAFT: TransactionDraft = {
  kind: 'expense',
  cents: 0,
  description: '',
  categoryId: null,
  date: '2026-10-30',
  account: 'nubank',
  method: null,
  note: '',
};

const EDIT_DRAFT: TransactionDraft = {
  kind: 'expense',
  cents: 18790,
  description: 'Mercado do bairro',
  categoryId: 'cat-market',
  date: '2026-10-29',
  account: 'itau',
  method: 'debit',
  note: '',
};

type DemoMode = 'create' | 'edit' | 'errors' | 'saving' | 'failed';

/** The same modal creates, edits, shows errors and shows the saving state: only the props change. */
function TransactionModalDemo({ mode }: { mode: DemoMode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TransactionDraft>(mode === 'edit' ? EDIT_DRAFT : EMPTY_DRAFT);
  const [showErrors, setShowErrors] = useState(mode === 'errors');
  const patch = (next: Partial<TransactionDraft>) =>
    setDraft((current) => ({ ...current, ...next }));
  const editing = mode === 'edit';

  const errors = {
    amount: showErrors && draft.cents === 0 ? 'Informe um valor maior que zero.' : undefined,
    description: showErrors && draft.description === '' ? 'Dê um nome ao lançamento.' : undefined,
  };

  return (
    <>
      <Button variant="secondary" onPress={() => setOpen(true)}>
        {
          {
            create: 'Nova transação',
            edit: 'Editar transação (com Excluir)',
            errors: 'Com erros nos campos',
            saving: 'Salvando',
            failed: 'Erro geral ao salvar',
          }[mode]
        }
      </Button>
      <FormModal
        isOpen={open}
        onOpenChange={setOpen}
        title={editing ? 'Editar transação' : 'Nova transação'}
        description={
          editing ? 'Mudou algo? Ajuste e salve.' : 'Lançada à mão. Entra nas contas do mês.'
        }
        submitLabel={editing ? 'Salvar' : 'Adicionar'}
        submittingLabel="Salvando..."
        isSubmitting={mode === 'saving'}
        submitDisabled={!editing && draft.cents === 0 && !showErrors}
        submitHint={!editing && draft.cents === 0 && !showErrors ? 'Informe o valor.' : undefined}
        error={mode === 'failed' ? 'Não deu para salvar agora. Tente de novo.' : undefined}
        destructive={editing ? { label: 'Excluir', onPress: () => setOpen(false) } : undefined}
        onSubmit={() => {
          if (draft.cents === 0 || draft.description === '') {
            setShowErrors(true);
            return;
          }
          setOpen(false);
        }}
      >
        <FormModalSplit
          aside={
            <>
              <AmountField
                cents={draft.cents}
                onChange={(cents) => patch({ cents })}
                kind={draft.kind}
                onKindChange={(kind) => patch({ kind })}
                error={errors.amount}
              />
              <FormModalGroup label="Detalhes">
                <TextField
                  label="Descrição"
                  value={draft.description}
                  onChange={(description) => patch({ description })}
                  error={errors.description}
                  placeholder="Ex.: Mercado"
                  autoComplete="off"
                  maxLength={200}
                />
                <CategoryPicker
                  label="Categoria"
                  categories={SAMPLE_CATEGORIES}
                  value={draft.categoryId}
                  onChange={(categoryId) => patch({ categoryId })}
                />
              </FormModalGroup>
            </>
          }
        >
          <FormModalGroup label="Quando e onde">
            <DateQuickField label="Data" value={draft.date} onChange={(date) => patch({ date })} />
            <ChoiceField
              label="Conta"
              options={ACCOUNTS}
              value={draft.account}
              onChange={(account) => patch({ account })}
            />
          </FormModalGroup>
          <FormModalMore summary={draft.method || draft.note ? 'preenchidas' : 'meio, nota'}>
            <ChoiceField
              label="Meio"
              options={METHODS}
              value={draft.method}
              onChange={(method) => patch({ method })}
            />
            <TextField
              label="Nota"
              value={draft.note}
              onChange={(note) => patch({ note })}
              placeholder="Opcional"
              autoComplete="off"
            />
          </FormModalMore>
        </FormModalSplit>
      </FormModal>
    </>
  );
}

/** A form without a hero: pairs of fields in two columns (wide container) and a short size. */
function PairsModalDemo() {
  const [open, setOpen] = useState(false);
  const [bank, setBank] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [day, setDay] = useState('2026-11-10');

  return (
    <>
      <Button variant="secondary" onPress={() => setOpen(true)}>
        Duas colunas, sem valor
      </Button>
      <FormModal
        isOpen={open}
        onOpenChange={setOpen}
        title="Novo cartão"
        description="Para acompanhar a fatura e o limite."
        submitLabel="Adicionar"
        onSubmit={() => setOpen(false)}
      >
        <FormModalGroup label="Cartão" columns={2}>
          <TextField label="Apelido" value={name} onChange={setName} placeholder="Ex.: Roxinho" />
          <SelectField
            label="Banco"
            options={[
              { key: 'nu', label: 'Nubank', icon: 'card' },
              { key: 'it', label: 'Itaú', icon: 'card' },
              { key: 'br', label: 'Bradesco', icon: 'card' },
            ]}
            value={bank}
            onChange={setBank}
            placeholder="Escolher banco"
          />
        </FormModalGroup>
        <FormModalGroup label="Fatura" columns={2}>
          <EditDateField label="Vencimento" value={day} onChange={setDay} />
          <MoneyField label="Limite" cents={500000} onChange={noop} />
        </FormModalGroup>
      </FormModal>
    </>
  );
}

function ScrollDemo() {
  return (
    <div className="h-40 w-72 overflow-y-auto rounded-input border border-line bg-field p-s16">
      {Array.from({ length: 14 }, (_, index) => (
        <p key={index} className="py-s4 text-label text-fg-secondary">
          Linha {index + 1} da área com rolagem
        </p>
      ))}
    </div>
  );
}

export const FORM_MODAL_SECTIONS: GallerySectionDef[] = [
  {
    id: 'form-modal',
    title: 'FormModal (padrão de modal)',
    content: (
      <>
        <GalleryVariant caption="criar: valor, grupos, Mais opções (abra e teste 1280×720 e 375 px)">
          <TransactionModalDemo mode="create" />
        </GalleryVariant>
        <GalleryVariant caption="editar: o mesmo modal, título e ação mudam; Excluir à esquerda">
          <TransactionModalDemo mode="edit" />
        </GalleryVariant>
        <GalleryVariant caption="erros nos campos (Salvar sem preencher)">
          <TransactionModalDemo mode="errors" />
        </GalleryVariant>
        <GalleryVariant caption="enviando (Esc e clique fora não fecham)">
          <TransactionModalDemo mode="saving" />
        </GalleryVariant>
        <GalleryVariant caption="erro geral do envio">
          <TransactionModalDemo mode="failed" />
        </GalleryVariant>
        <GalleryVariant caption="duas colunas por pares (sem valor protagonista)">
          <PairsModalDemo />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'amount-field',
    title: 'AmountField (entrada de valor)',
    content: (
      <>
        <State<{ cents: number; kind: AmountKind }> initial={{ cents: 123456, kind: 'expense' }}>
          {(value, set) => (
            <GalleryVariant caption="despesa (digite 1, 12, 123; cole R$ 1.234,56)" width={320}>
              <AmountField
                cents={value.cents}
                kind={value.kind}
                onChange={(cents) => set({ ...value, cents })}
                onKindChange={(kind) => set({ ...value, kind })}
                description="Sai da conta."
              />
            </GalleryVariant>
          )}
        </State>
        <State<{ cents: number; kind: AmountKind }> initial={{ cents: 450000, kind: 'income' }}>
          {(value, set) => (
            <GalleryVariant caption="receita" width={320}>
              <AmountField
                cents={value.cents}
                kind={value.kind}
                onChange={(cents) => set({ ...value, cents })}
                onKindChange={(kind) => set({ ...value, kind })}
              />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="vazio" width={320}>
          <AmountField cents={0} onChange={noop} kind="expense" onKindChange={noop} />
        </GalleryVariant>
        <GalleryVariant caption="com erro" width={320}>
          <AmountField
            cents={0}
            onChange={noop}
            kind="expense"
            onKindChange={noop}
            error="Informe um valor maior que zero."
          />
        </GalleryVariant>
        <GalleryVariant caption="desabilitado" width={320}>
          <AmountField cents={9990} onChange={noop} kind="income" onKindChange={noop} isDisabled />
        </GalleryVariant>
        <State initial={999999999999}>
          {(cents, set) => (
            <GalleryVariant caption="valor enorme: o número encolhe, não corta" width={320}>
              <AmountField cents={cents} onChange={set} />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="sem seletor de tipo (só o valor)" width={320}>
          <AmountField cents={2500} onChange={noop} label="Limite" />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'form-choice-fields',
    title: 'Campos de escolha (ChoiceField, SelectField, CategoryPicker, DateQuickField)',
    content: (
      <>
        <State<string | null> initial="itau">
          {(value, set) => (
            <GalleryVariant caption="ChoiceField chips" width={360}>
              <ChoiceField label="Conta" options={ACCOUNTS} value={value} onChange={set} />
            </GalleryVariant>
          )}
        </State>
        <State<string | null> initial="month">
          {(value, set) => (
            <GalleryVariant caption="ChoiceField segmentado" width={360}>
              <ChoiceField
                label="Frequência"
                variant="segmented"
                options={[
                  { key: 'month', label: 'Mensal' },
                  { key: 'year', label: 'Anual' },
                ]}
                value={value}
                onChange={set}
              />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="ChoiceField com erro" width={360}>
          <ChoiceField
            label="Conta"
            options={ACCOUNTS}
            value={null}
            onChange={noop}
            error="Escolha uma conta."
          />
        </GalleryVariant>
        <State<string | null> initial={null}>
          {(value, set) => (
            <GalleryVariant caption="SelectField" width={320}>
              <SelectField
                label="Conta"
                options={ACCOUNTS}
                value={value}
                onChange={set}
                placeholder="Escolher conta"
              />
            </GalleryVariant>
          )}
        </State>
        <State<string | null> initial="cat-market">
          {(value, set) => (
            <GalleryVariant caption="CategoryPicker (digite para buscar)" width={320}>
              <CategoryPicker
                label="Categoria"
                categories={SAMPLE_CATEGORIES}
                value={value}
                onChange={set}
              />
            </GalleryVariant>
          )}
        </State>
        <State initial="2026-10-30">
          {(value, set) => (
            <GalleryVariant caption="DateQuickField" width={360}>
              <DateQuickField label="Data" value={value} onChange={set} />
            </GalleryVariant>
          )}
        </State>
        <State initial="2026-10-12">
          {(value, set) => (
            <GalleryVariant caption="DateQuickField com outra data" width={360}>
              <DateQuickField label="Data" value={value} onChange={set} />
            </GalleryVariant>
          )}
        </State>
      </>
    ),
  },
  {
    id: 'field-focus',
    title: 'Foco dos campos (um anel só) e scrollbar',
    content: (
      <>
        <GalleryVariant
          caption="Tab por todos: texto, busca, data, seleção, valor, categoria"
          width={320}
        >
          <div className="flex flex-col gap-s16">
            <TextField label="Texto" value="Mercado" onChange={noop} />
            <SearchField label="Buscar" value="" onChange={noop} />
            <EditDateField label="Data" value="2026-10-30" onChange={noop} />
            <SelectField label="Seleção" options={ACCOUNTS} value="itau" onChange={noop} />
            <MoneyField label="Valor" cents={1234} onChange={noop} />
            <TextField label="Inválido" value="" onChange={noop} error="Campo obrigatório." />
          </div>
        </GalleryVariant>
        <GalleryVariant caption="Scrollbar do sistema (claro e escuro; passe o mouse no polegar)">
          <ScrollDemo />
        </GalleryVariant>
      </>
    ),
  },
];
