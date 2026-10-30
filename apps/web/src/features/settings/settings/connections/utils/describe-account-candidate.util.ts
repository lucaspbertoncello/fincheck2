const TYPE_LABEL = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  wallet: 'Carteira',
  credit_card: 'Cartão',
} as const;

/** "Conta corrente · Nubank" for a candidate account of a reconnection. */
export function describeAccountCandidate(candidate: {
  name: string;
  type: keyof typeof TYPE_LABEL;
}): string {
  return `${candidate.name} · ${TYPE_LABEL[candidate.type]}`;
}
