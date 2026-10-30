import type {
  CategoryGroupData,
  CategoryOption,
  CounterpartOption,
  SplitPart,
  TransactionEditValues,
  TransactionRowData,
} from '@fincheck/ui';

export const SAMPLE_CATEGORIES: CategoryOption[] = [
  { id: 'cat-food', name: 'Restaurantes', icon: 'food' },
  { id: 'cat-delivery', name: 'Delivery', icon: 'delivery' },
  { id: 'cat-market', name: 'Mercado', icon: 'cart' },
  { id: 'cat-transport', name: 'Transporte', icon: 'car' },
  { id: 'cat-health', name: 'Saúde', icon: 'health' },
  { id: 'cat-fun', name: 'Lazer', icon: 'fun' },
];

export const SAMPLE_COUNTERPARTS: CounterpartOption[] = [
  { id: 'cp-1', label: 'Pix para Rio Azul, 20 out., R$ 500,00' },
  { id: 'cp-2', label: 'TED recebida Vale Verde, 21 out., R$ 500,00' },
];

export const SAMPLE_EDIT_VALUES: TransactionEditValues = {
  description: 'Mocoto Restaurante',
  amountCents: 8790,
  date: '2026-10-19',
  categoryId: 'cat-food',
  tags: ['almoço', 'trabalho'],
  nature: 'expense',
  counterpartId: null,
};

export const SAMPLE_SPLIT_PARTS: SplitPart[] = [
  { id: 'part-1', categoryId: 'cat-market', amountCents: 14000 },
  { id: 'part-2', categoryId: 'cat-health', amountCents: 6800 },
];

const BASE_ROW: TransactionRowData = {
  id: 'trx-base',
  name: 'Padaria Estrela do Sul',
  kind: 'expense',
  amountCents: -3890,
  categoryIcon: 'food',
  categoryName: 'Restaurantes',
  accountLabel: 'Banco Aurora, crédito',
};

export const ROW_SAMPLES: { caption: string; row: TransactionRowData }[] = [
  { caption: 'Despesa', row: BASE_ROW },
  {
    caption: 'Receita',
    row: {
      ...BASE_ROW,
      id: 'trx-income',
      name: 'Pix de Ana Montenegro',
      kind: 'income',
      amountCents: 420000,
      categoryIcon: 'salary',
      categoryName: 'Salário',
      accountLabel: 'Banco Aurora, Pix',
    },
  },
  {
    caption: 'Transferência (fora da conta)',
    row: {
      ...BASE_ROW,
      id: 'trx-transfer',
      name: 'Transferência entre contas',
      kind: 'transfer',
      amountCents: -50000,
      categoryIcon: 'transfer',
      categoryName: 'Transferência entre contas',
      accountLabel: 'Banco Aurora, conta',
      outOfAccount: true,
    },
  },
  {
    caption: 'Tags, parcela, pendente, para revisar, editada',
    row: {
      ...BASE_ROW,
      id: 'trx-chips',
      name: 'Eletro Pinheiro',
      amountCents: -12990,
      categoryIcon: 'plug',
      categoryName: 'Casa',
      tags: ['delivery', 'presente'],
      installment: { number: 3, total: 10 },
      pending: true,
      toReview: true,
      edited: true,
    },
  },
  {
    caption: 'Sem categoria',
    row: {
      ...BASE_ROW,
      id: 'trx-uncat',
      name: 'PAG*ComercialVR',
      categoryIcon: 'tag',
      categoryName: '',
      uncategorized: true,
    },
  },
  {
    caption: 'Dividida em 2',
    row: { ...BASE_ROW, id: 'trx-split', name: 'Supermercado Pedra Branca', splitParts: 2 },
  },
  {
    caption: 'Ignorada',
    row: { ...BASE_ROW, id: 'trx-ignored', name: 'Cobrança duplicada', ignored: true },
  },
  {
    caption: 'Abateu dívida',
    row: {
      ...BASE_ROW,
      id: 'trx-debt',
      name: 'Pix para Rafa Mendonça',
      amountCents: -15000,
      debtPaidCents: 15000,
      debtPerson: 'Rafa',
    },
  },
];

export const CATEGORY_GROUP_SAMPLES: CategoryGroupData[] = [
  {
    id: 'grp-delivery',
    name: 'Delivery',
    icon: 'delivery',
    totalCents: 84250,
    sharePercent: 23.3,
    count: 14,
    variationPercent: 108,
    items: [
      {
        id: 'gi-1',
        dateLabel: '22 out.',
        name: 'Burger Colina',
        accountLabel: 'Banco Aurora, crédito',
        cents: 5490,
      },
      {
        id: 'gi-2',
        dateLabel: '21 out.',
        name: 'Sushi do Largo',
        accountLabel: 'Banco Aurora, crédito',
        cents: 9200,
      },
    ],
  },
  {
    id: 'grp-market',
    name: 'Mercado',
    icon: 'cart',
    totalCents: 61000,
    sharePercent: 16.9,
    count: 6,
    variationPercent: -4,
  },
  {
    id: 'grp-none',
    name: 'Sem categoria',
    icon: 'tag',
    uncategorized: true,
    totalCents: 12800,
    sharePercent: 3.5,
    count: 3,
    caption: 'Previsto 25/10',
  },
];
