import type { CategoryGroupData, CategoryOption, TransactionRowData } from '@fincheck/ui';

export const SAMPLE_CATEGORIES: CategoryOption[] = [
  { id: 'cat-food', name: 'Restaurantes', icon: 'food' },
  { id: 'cat-delivery', name: 'Delivery', icon: 'delivery' },
  { id: 'cat-market', name: 'Mercado', icon: 'cart' },
  { id: 'cat-transport', name: 'Transporte', icon: 'car' },
  { id: 'cat-health', name: 'Saúde', icon: 'health' },
  { id: 'cat-fun', name: 'Lazer', icon: 'fun' },
];

const BASE_ROW: TransactionRowData = {
  id: 'trx-base',
  name: 'Padaria Estrela do Sul',
  kind: 'expense',
  amountCents: -3890,
  categoryIcon: 'food',
  categoryNames: ['Restaurantes'],
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
      categoryNames: ['Salário'],
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
      categoryNames: ['Transferência entre contas'],
      accountLabel: 'Banco Aurora, conta',
      outOfAccount: true,
    },
  },
  {
    caption: 'Tags, parcela, não lançada (passe o mouse no selo), para revisar, editada',
    row: {
      ...BASE_ROW,
      id: 'trx-chips',
      name: 'Eletro Pinheiro',
      amountCents: -12990,
      categoryIcon: 'plug',
      categoryNames: ['Casa'],
      tags: ['delivery', 'presente'],
      installment: { number: 3, total: 10 },
      pending: true,
      toReview: true,
      edited: true,
    },
  },
  {
    caption:
      'Nome longo (uma linha, trunca) e muita coisa para dizer (dois selos, o resto no detalhe)',
    row: {
      ...BASE_ROW,
      id: 'trx-long',
      name: 'MOCOTO RESTAURANTE E LANCHONETE DO CENTRO COMERCIAL DE SAO PAULO LTDA',
      amountCents: -1234567,
      categoryNames: ['Restaurantes'],
      accountLabel: 'Bradesco Black, crédito',
      pending: true,
      bankChanged: true,
      installment: { number: 3, total: 10 },
      tags: ['trabalho'],
    },
  },
  {
    caption: 'Sem categoria',
    row: {
      ...BASE_ROW,
      id: 'trx-uncat',
      name: 'PAG*ComercialVR',
      categoryIcon: 'tag',
      categoryNames: [],
      uncategorized: true,
    },
  },
  {
    caption: 'Dividida em 2: uma categoria para cada parte',
    row: {
      ...BASE_ROW,
      id: 'trx-split',
      name: 'Supermercado Pedra Branca',
      categoryIcon: 'split',
      categoryNames: ['Mercado', 'Casa'],
      splitParts: 2,
    },
  },
  {
    caption: 'Dividida em 3: duas categorias e "+1"',
    row: {
      ...BASE_ROW,
      id: 'trx-split-many',
      name: 'Compra no Atacadão Norte',
      categoryIcon: 'split',
      categoryNames: ['Mercado', 'Casa', 'Saúde'],
      tags: ['mensal'],
      splitParts: 3,
    },
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
