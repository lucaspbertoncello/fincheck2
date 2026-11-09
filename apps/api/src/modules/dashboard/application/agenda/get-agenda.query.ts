import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import type { AgendaLoader } from '#/modules/dashboard/application/agenda/agenda-loader.service.ts';
import { buildAgenda } from '#/modules/dashboard/domain/agenda/build-agenda.util.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// "Recorrentes > A pagar e receber" (BR-BIL-001, 002, 005; BR-INV-002; BR-DSH-003, 009; RF-BIL-001 to
// 004, RF-INV-001, RF-DSH-008): the bills, the invoices and the occurrences of a month in the one
// shape of the Livre, with what each one still lacks and the "pagamento presumido" ("pago, falta
// vincular"). The lists are in `buildAgenda`. The controller creates the missing occurrences first.
export class GetAgendaQuery {
  private readonly loader: AgendaLoader;

  constructor(loader: AgendaLoader) {
    this.loader = loader;
  }

  async execute(input: GetAgendaQuery.Input): Promise<GetAgendaQuery.Output> {
    const month = Month.of(input.month);
    assertSupportedMonth(month, 'month');
    const snapshot = await this.loader.load({ month, withSettled: true });

    return buildAgenda({ month, today: snapshot.today, entries: snapshot.entries });
  }
}

export namespace GetAgendaQuery {
  export type Input = Agenda.Query;
  export type Output = Agenda.Dto;
}
