/**
 * The words of the card and of the screen by side: the two lines under the value, what a screen
 * reader adds after each link, and what the list says when it is empty (all or only what is missing).
 */
export const TOTAL_CARD_WORDS = {
  income: {
    settled: 'já recebidos',
    settledHint: 'ver as transações recebidas neste mês',
    missingHint: 'ver o que falta receber',
    none: 'Nenhuma receita fixa',
    emptyList: 'Nenhuma receita fixa neste mês.',
    emptyMissing: 'Nada falta receber neste mês.',
  },
  expense: {
    settled: 'pagos',
    settledHint: 'ver as transações pagas neste mês',
    missingHint: 'ver o que falta pagar',
    none: 'Nenhuma despesa fixa',
    emptyList: 'Nenhuma despesa fixa neste mês.',
    emptyMissing: 'Nada falta pagar neste mês.',
  },
} as const;
