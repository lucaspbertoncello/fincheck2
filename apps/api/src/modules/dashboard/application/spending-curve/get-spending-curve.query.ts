import type { SpendingCurve } from '@fincheck/shared/dashboard/spending-curve/spending-curve.type.ts';

import type { SpendingLineReader } from '#/modules/dashboard/application/spending-line/spending-line-reader.interface.ts';
import { computeSpendingCurve } from '#/modules/dashboard/domain/spending-curve/compute-spending-curve.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// "Gasto do mês" of the Visão geral (BR-DSH-001, 004; RF-DSH-003): the spending of the month by day,
// accumulated, against the month before. The lines are the spending by competence of both months.
export class GetSpendingCurveQuery {
  private readonly lines: SpendingLineReader;
  private readonly clock: Clock;

  constructor(lines: SpendingLineReader, clock: Clock) {
    this.lines = lines;
    this.clock = clock;
  }

  async execute(input: GetSpendingCurveQuery.Input): Promise<GetSpendingCurveQuery.Output> {
    const month = Month.of(input.month);
    assertSupportedMonth(month, 'month');

    const lines = await this.lines.listLines({
      kind: 'expense',
      from: month.previous().firstDay().value,
      to: month.lastDay().value,
    });

    return computeSpendingCurve({
      month,
      today: this.clock.today(),
      // Spending is `-amount`; written as a subtraction so a zero stays a plain 0.
      lines: lines.map((line) => ({ on: line.on, cents: 0 - line.amountCents })),
    });
  }
}

export namespace GetSpendingCurveQuery {
  export type Input = { month: string };
  export type Output = SpendingCurve.Dto;
}
