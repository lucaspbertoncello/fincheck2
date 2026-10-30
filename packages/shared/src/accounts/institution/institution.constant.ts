// Closed list of pre-registered banks. `wallet` and `other` are schema codes with no bank brand.
export const INSTITUTIONS = [
  { code: 'banco-do-brasil', name: 'Banco do Brasil', defaultThemeId: 'banco-do-brasil' },
  { code: 'bradesco', name: 'Bradesco', defaultThemeId: 'bradesco' },
  { code: 'nubank', name: 'Nubank', defaultThemeId: 'nubank' },
  { code: 'inter', name: 'Inter', defaultThemeId: 'inter' },
  { code: 'itau', name: 'Itaú', defaultThemeId: 'itau' },
  { code: 'santander', name: 'Santander', defaultThemeId: 'santander' },
  { code: 'caixa', name: 'Caixa', defaultThemeId: 'caixa' },
  { code: 'c6', name: 'C6 Bank', defaultThemeId: 'c6' },
  { code: 'picpay', name: 'PicPay', defaultThemeId: 'picpay' },
  { code: 'mercado-pago', name: 'Mercado Pago', defaultThemeId: 'mercado-pago' },
] as const;

export const INSTITUTION_CODES = [
  'banco-do-brasil',
  'bradesco',
  'nubank',
  'inter',
  'itau',
  'santander',
  'caixa',
  'c6',
  'picpay',
  'mercado-pago',
  'wallet',
  'other',
] as const;
