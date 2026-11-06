import type {
  ChartPoint,
  DonutSlice,
  FreeBalanceData,
  ManagedCategory,
  SettingsNavItem,
  StepItem,
  TagItem,
} from '@fincheck/ui';

function cumulative(daily: number[]): ChartPoint[] {
  let total = 0;
  return daily.map((cents, index) => {
    total += cents;
    return { day: index + 1, cents: total };
  });
}

export const SPEND_CURRENT: ChartPoint[] = cumulative([
  12000, 8000, 0, 35000, 9000, 4000, 22000, 0, 15000, 48000, 6000, 0, 19000, 7000, 31000, 5000, 0,
  24000, 11000, 9000, 16000, 7000,
]);

export const SPEND_PREVIOUS: ChartPoint[] = cumulative([
  9000, 14000, 5000, 20000, 0, 18000, 6000, 12000, 0, 30000, 8000, 4000, 22000, 0, 11000, 17000,
  9000, 0, 26000, 13000, 7000, 15000, 0, 10000, 21000, 6000, 12000, 0, 18000, 9000, 5000,
]);

export const DONUT_SLICES: DonutSlice[] = [
  { id: 'dn-1', name: 'Delivery', cents: 84250 },
  { id: 'dn-2', name: 'Mercado', cents: 61000 },
  { id: 'dn-3', name: 'Transporte', cents: 38400 },
  { id: 'dn-4', name: 'Saúde', cents: 27000 },
  { id: 'dn-5', name: 'Lazer', cents: 15800 },
  { id: 'dn-6', name: 'Outros pequenos', cents: 9900, isOther: true },
];

export const FREE_BALANCE: FreeBalanceData = {
  balanceCents: 640000,
  freeCents: 585000,
  perDayCents: 58500,
  windowDays: 10,
  lines: [
    {
      key: 'receivable',
      label: 'A receber',
      subtitle: 'Vale Verde',
      cents: 420000,
      sign: 'plus',
      items: [{ id: 'fb-3', label: 'Vale Verde', cents: 420000 }],
    },
    {
      key: 'payable',
      label: 'A pagar',
      subtitle: 'até 30/11',
      cents: 475000,
      sign: 'minus',
      items: [
        { id: 'fb-4', label: 'Aluguel', cents: 180000 },
        { id: 'fb-5', label: 'Fatura Banco Aurora', cents: 295000 },
      ],
    },
  ],
  accounts: [
    {
      id: 'fa-1',
      name: 'Banco Aurora',
      balanceCents: 420000,
    },
    {
      id: 'fa-2',
      name: 'Rio Azul',
      balanceCents: 220000,
    },
    { id: 'fa-3', name: 'Carteira', balanceCents: 12000 },
  ],
  moreAccountsHref: '#accounts',
};

/** Longest case: long names, values in the R$ 100.000,00 range. The panel must still fit 100dvh - 32 px. */
export const FREE_BALANCE_LONG: FreeBalanceData = {
  ...FREE_BALANCE,
  balanceCents: 10000000,
  freeCents: 7345012,
  perDayCents: 734501,
  lines: [
    {
      key: 'receivable',
      label: 'A receber',
      subtitle: 'Consultoria Vale Verde Tecnologia e mais 3',
      cents: 12500000,
      sign: 'plus',
      items: [{ id: 'fl-1', label: 'Consultoria Vale Verde Tecnologia', cents: 12500000 }],
    },
    {
      key: 'payable',
      label: 'A pagar',
      subtitle: 'até 30/11',
      cents: 10154988,
      sign: 'minus',
      items: [],
    },
  ],
  accounts: [
    {
      id: 'fl-a1',
      name: 'Banco Aurora Internacional Prime',
      balanceCents: 9500000,
    },
    {
      id: 'fl-a2',
      name: 'Rio Azul Investimentos e Previdência',
      balanceCents: 500000,
    },
    { id: 'fl-a3', name: 'Carteira', balanceCents: 12000 },
    { id: 'fl-a4', name: 'Reserva', balanceCents: 12000 },
  ],
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    key: 'connections',
    title: 'Conexões',
    subtitle: 'Banco Aurora e Rio Azul',
    icon: 'plug',
    href: '#connections',
  },
  {
    key: 'backup',
    title: 'Backup',
    subtitle: 'Último há 2 dias',
    icon: 'database',
    href: '#backup',
  },
  {
    key: 'appearance',
    title: 'Aparência',
    subtitle: 'Claro, escuro ou do sistema',
    icon: 'sun',
    href: '#appearance',
  },
];

export const STEPS: StepItem[] = [
  { key: 'st-1', title: 'Conectar no Meu Pluggy', description: 'Feito em 12/10', status: 'done' },
  {
    key: 'st-2',
    title: 'Escolher os bancos',
    description: 'Marque os que deseja acompanhar',
    status: 'current',
  },
  { key: 'st-3', title: 'Importar o histórico', status: 'todo' },
];

export const MANAGED_CATEGORIES: ManagedCategory[] = [
  {
    id: 'mc-1',
    name: 'Delivery',
    icon: 'delivery',
    transactionCount: 142,
    ruleCount: 3,
    lastUsedLabel: 'ontem',
  },
  {
    id: 'mc-2',
    name: 'Mercado',
    icon: 'cart',
    transactionCount: 96,
    ruleCount: 1,
    lastUsedLabel: '3 out.',
  },
  {
    id: 'mc-4',
    name: 'Assinaturas de streaming, jogos e aplicativos de leitura',
    icon: 'wifi',
    transactionCount: 1,
    ruleCount: 12,
    lastUsedLabel: '28 ago., há 2 meses',
  },
  {
    id: 'mc-3',
    name: 'Academia',
    icon: 'gym',
    transactionCount: 27,
    ruleCount: 0,
    lastUsedLabel: '28 ago., há 2 meses',
    archived: true,
    archivedNote: 'Despesa · 27 transações · usada até maio',
  },
];

export const TAGS: TagItem[] = [
  { id: 'tg-1', name: 'delivery', transactionCount: 58 },
  { id: 'tg-2', name: 'presente', transactionCount: 9 },
  { id: 'tg-3', name: 'viagem-2025', transactionCount: 31, archived: true },
];
