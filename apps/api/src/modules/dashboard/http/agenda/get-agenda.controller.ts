import type { GetAgendaQuery } from '#/modules/dashboard/application/agenda/get-agenda.query.ts';
import type { OccurrenceEnsurer } from '#/modules/dashboard/application/occurrence/occurrence-ensurer.interface.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class GetAgendaController {
  private readonly ensureOccurrences: OccurrenceEnsurer;
  private readonly getAgenda: GetAgendaQuery;

  constructor(ensureOccurrences: OccurrenceEnsurer, getAgenda: GetAgendaQuery) {
    this.ensureOccurrences = ensureOccurrences;
    this.getAgenda = getAgenda;
  }

  async handle(request: GetAgendaController.Request): Promise<GetAgendaController.Response> {
    await this.ensureOccurrences.execute();

    return this.getAgenda.execute(request.query);
  }
}

export namespace GetAgendaController {
  export type Request = { query: GetAgendaQuery.Input };
  export type Response = GetAgendaQuery.Output;
}
