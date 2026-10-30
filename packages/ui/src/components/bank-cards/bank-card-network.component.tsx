import type { BankNetwork } from '#/components/bank-cards/bank-theme.type.ts';

type BankCardNetworkProps = {
  network: BankNetwork;
};

/** Mastercard in colors; Visa and Elo in text, in the color of the card text (components.md 3.3). */
export function BankCardNetwork({ network }: BankCardNetworkProps) {
  if (network === 'mc') {
    return (
      <span aria-hidden="true" className="isolate flex">
        <i
          className="block rounded-capsule"
          style={{ width: '7.4cqw', height: '7.4cqw', background: '#EB001B' }}
        />
        <i
          className="block rounded-capsule"
          style={{
            width: '7.4cqw',
            height: '7.4cqw',
            marginLeft: '-3cqw',
            background: '#F79E1B',
            opacity: 0.92,
          }}
        />
      </span>
    );
  }
  if (network === 'visa') {
    return (
      <span
        aria-hidden="true"
        className="font-money font-emphasis italic"
        style={{ fontSize: '6cqw', letterSpacing: '-0.02em' }}
      >
        VISA
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="font-title"
      style={{ fontSize: '6.4cqw', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.8 }}
    >
      elo
    </span>
  );
}
