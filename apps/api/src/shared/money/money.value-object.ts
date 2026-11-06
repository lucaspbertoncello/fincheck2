import { allocateCents } from '@fincheck/shared/common/money/allocate-cents.util.ts';

// An amount in BRL as a whole number of cents. No float anywhere; the only currency is the real
// (RNF-008). Immutable: every operation returns a new `Money`. A negative amount leaves the
// account (or enters the card debt); a positive one enters.
export class Money {
  readonly cents: number;

  private constructor(cents: number) {
    this.cents = cents;
  }

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new RangeError(`Money needs a whole number of cents, got ${String(cents)}`);
    }

    // `-0` prints as `0` but fails `Object.is`; normalize it away.
    return new Money(cents === 0 ? 0 : cents);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return Money.fromCents(this.cents - other.cents);
  }

  negate(): Money {
    return Money.fromCents(-this.cents);
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  // Splits into `parts` amounts that add up to the total. The first part takes the leftover cents
  // (R$ 100,00 in 3 is 33,34 + 33,33 + 33,33). Same rule as the form preview in the web.
  allocate(parts: number): Money[] {
    return allocateCents(this.cents, parts).map((cents) => Money.fromCents(cents));
  }
}
