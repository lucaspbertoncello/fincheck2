import type {
  DateRuleOption,
  DayMarker,
  DayStripDay,
  NavItem,
  ReviewChoice,
  ReviewQueueItemData,
  ReviewTransaction,
  RuleRowData,
  TotalCardItem,
} from '@fincheck/ui';

export const TODAY = '2026-10-22';

export type DayItem = { id: string; name: string; cents: number };

function dayItems(date: string): DayItem[] {
  if (date === '2026-10-22') return [{ id: `${date}-a`, name: 'Streaming Lume', cents: -3990 }];
  if (date === '2026-10-25') return [{ id: `${date}-a`, name: 'Aluguel', cents: -180000 }];
  if (date === '2026-10-28') {
    return [
      { id: `${date}-a`, name: 'Vale Verde (salário)', cents: 420000 },
      { id: `${date}-b`, name: 'Academia Corpo & Mente', cents: -12990 },
    ];
  }
  return [];
}

const MARKERS: Record<string, DayMarker[]> = {
  '2026-10-05': [{ flow: 'income', status: 'happened' }],
  '2026-10-10': [{ flow: 'expense', status: 'happened' }],
  '2026-10-15': [
    { flow: 'expense', status: 'late' },
    { flow: 'income', status: 'partial' },
  ],
  '2026-10-22': [{ flow: 'expense', status: 'different' }],
  '2026-10-25': [{ flow: 'expense', status: 'expected' }],
  '2026-10-28': [
    { flow: 'income', status: 'expected' },
    { flow: 'expense', status: 'expected' },
  ],
};

function pad(day: number): string {
  return `2026-10-${String(day).padStart(2, '0')}`;
}

/** The 10 days from today to the end of the month, with what comes in, goes out and the projected balance. */
export const PROJECTION_DAYS: DayStripDay<DayItem>[] = Array.from({ length: 10 }, (_, index) => {
  const date = pad(22 + index);
  const items = dayItems(date);
  return {
    date,
    items,
    inCents: items.filter((item) => item.cents > 0).reduce((sum, item) => sum + item.cents, 0),
    outCents: items.filter((item) => item.cents < 0).reduce((sum, item) => sum - item.cents, 0),
    totalCents: items.length > 0 ? 250000 + index * 15000 - (index > 3 ? 190000 : 0) : undefined,
  };
});

/** The whole month with markers. */
export const MONTH_DAYS: DayStripDay<DayItem>[] = Array.from({ length: 31 }, (_, index) => {
  const date = pad(index + 1);
  return { date, items: dayItems(date), markers: MARKERS[date] ?? [] };
});

export const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'Visão geral', href: '#overview', icon: 'dashboard' },
  { key: 'transactions', label: 'Transações', href: '#transactions', icon: 'list' },
  { key: 'recurrences', label: 'Recorrências', href: '#recurrences', icon: 'repeat' },
  {
    key: 'accounts',
    label: 'Contas e cartões',
    shortLabel: 'Contas',
    href: '#accounts',
    icon: 'card',
  },
  { key: 'planning', label: 'Planejamento', href: '#planning', icon: 'chart' },
];

export const REVIEW_TRANSACTION: ReviewTransaction = {
  name: 'MOCOTO RESTAURANTE',
  detail: 'Banco Aurora, crédito, 19/10',
  amountCents: -8790,
  kind: 'expense',
  icon: 'food',
};

export const REVIEW_SUGGESTIONS: ReviewChoice[] = [
  { id: 'cat-food', label: 'Restaurantes', icon: 'food' },
  { id: 'cat-delivery', label: 'Delivery', icon: 'delivery' },
  { id: 'cat-fun', label: 'Lazer', icon: 'fun' },
];

export const REVIEW_QUEUE: ReviewQueueItemData[] = [
  {
    id: 'rq-1',
    name: 'FARMACIA SAO JOAO',
    detail: 'Banco Aurora, débito, 21/10',
    amountCents: -4590,
    kind: 'expense',
    icon: 'health',
  },
  {
    id: 'rq-2',
    name: 'Pix de G. Prado',
    detail: 'Banco Aurora, Pix, 21/10',
    amountCents: 35000,
    kind: 'income',
    icon: 'hand-money',
    ambiguity: {
      message: 'Mesada ou VR? O valor não bate com nenhum',
      options: [
        { id: 'opt-allowance', label: 'Mesada', icon: 'gift' },
        { id: 'opt-voucher', label: 'VR', icon: 'food' },
      ],
      otherLabel: 'Outra receita',
    },
  },
];

export const DATE_RULE_OPTIONS: DateRuleOption[] = [
  { key: 'fixed', label: 'Dia fixo', hint: 'Todo dia 20', icon: 'calendar' },
  { key: 'business', label: 'Dia útil', hint: 'Até o 5º dia útil', icon: 'list' },
  { key: 'around', label: 'Por volta do dia', hint: 'Por volta do dia 25', icon: 'clock' },
  { key: 'any', label: 'Qualquer dia', hint: 'Sem data certa', icon: 'repeat' },
];

export const TOTAL_ITEMS: TotalCardItem[] = [
  { key: 'rent', label: 'Aluguel', note: 'vence 25/10', cents: 180000 },
  { key: 'internet', label: 'Internet Fibra Norte', note: 'vence 27/10', cents: 11990 },
  { key: 'card', label: 'Fatura Banco Aurora', note: 'vence 06/11', cents: 98430 },
];

export const RULE_ROWS: RuleRowData[] = [
  {
    id: 'rule-1',
    icon: 'delivery',
    appliedCount: 38,
    active: true,
    phrase: [
      'Sempre que a descrição contém ',
      { strong: 'BURGER' },
      ', vai para ',
      { strong: 'Delivery' },
      ' com a tag ',
      { strong: 'delivery' },
      '.',
    ],
  },
  {
    id: 'rule-2',
    icon: 'car',
    appliedCount: 1,
    active: false,
    phrase: [
      'Sempre que a descrição contém ',
      { strong: 'UBER *TRIP' },
      ' e o valor passa de ',
      { moneyCents: 5000 },
      ', vai para ',
      { strong: 'Transporte' },
      '.',
    ],
  },
];
