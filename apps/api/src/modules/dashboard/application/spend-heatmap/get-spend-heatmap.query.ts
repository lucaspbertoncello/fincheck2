import type { SpendHeatmap } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.type.ts';

import type { SpendingLineReader } from '#/modules/dashboard/application/spending-line/spending-line-reader.interface.ts';
import { buildSpendHeatmap } from '#/modules/dashboard/domain/spend-heatmap/build-spend-heatmap.util.ts';
import { resolveHeatmapWindow } from '#/modules/dashboard/domain/spend-heatmap/resolve-heatmap-window.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedDate } from '#/shared/date/assert-supported-date.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The map of spending of the Perfil (BR-PRF-003, BR-DSH-001): a square per day, the same lines of
// spending by competence as the curve and the categories. By default 12 whole calendar months up
// to `until` (today); or `from` and `to`, a month or a year, when the front asks for one.
export class GetSpendHeatmapQuery {
  private readonly lines: SpendingLineReader;
  private readonly clock: Clock;

  constructor(lines: SpendingLineReader, clock: Clock) {
    this.lines = lines;
    this.clock = clock;
  }

  async execute(input: GetSpendHeatmapQuery.Input): Promise<GetSpendHeatmapQuery.Output> {
    const parse = (value: string | undefined, path: string) => {
      if (value === undefined) return undefined;
      const date = BusinessDate.of(value);
      assertSupportedDate(date, path);

      return date;
    };
    const window = resolveHeatmapWindow({
      until: parse(input.until, 'until'),
      from: parse(input.from, 'from'),
      to: parse(input.to, 'to'),
      today: this.clock.today(),
    });

    const lines = await this.lines.listLines({
      kind: 'expense',
      from: window.fromOn.value,
      to: window.untilOn.value,
    });

    return buildSpendHeatmap({
      ...window,
      lines: lines.map((line) => ({ on: line.on, cents: 0 - line.amountCents })),
    });
  }
}

export namespace GetSpendHeatmapQuery {
  export type Input = SpendHeatmap.Query;
  export type Output = SpendHeatmap.Dto;
}
