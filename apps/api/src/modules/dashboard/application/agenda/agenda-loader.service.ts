import type { AgendaAccount } from '#/modules/dashboard/domain/agenda/agenda-account.type.ts';
import type { AgendaEntry } from '#/modules/dashboard/domain/agenda/agenda-entry.type.ts';
import type { AgendaOccurrence } from '#/modules/dashboard/domain/agenda/agenda-occurrence.type.ts';
import { buildBillAgendaEntry } from '#/modules/dashboard/domain/agenda/build-bill-agenda-entry.util.ts';
import { buildInvoiceAgendaEntry } from '#/modules/dashboard/domain/agenda/build-invoice-agenda-entry.util.ts';
import { buildOccurrenceAgendaEntry } from '#/modules/dashboard/domain/agenda/build-occurrence-agenda-entry.util.ts';
import { resolvePresumedConflicts } from '#/modules/dashboard/domain/agenda/resolve-presumed-conflicts.util.ts';
import type { DashboardAccountReader } from '#/modules/dashboard/application/account/dashboard-account-reader.interface.ts';
import type { AgendaBillReader } from '#/modules/dashboard/application/bill/agenda-bill-reader.interface.ts';
import type { AgendaInvoiceReader } from '#/modules/dashboard/application/invoice/agenda-invoice-reader.interface.ts';
import type { AgendaOccurrenceReader } from '#/modules/dashboard/application/occurrence/agenda-occurrence-reader.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// Gathers what the Livre, the timeline, the summary and the agenda have in common: the accounts,
// the invoices, the bills and the occurrences of a month, each owner asked through its port, turned
// into the items of the agenda (`AgendaEntry`). The Livre is always of the current month, from today
// to its end, whatever month is being read: `countsInFreeBalance` is about that, so the same items
// feed every number. Nothing here writes; the caller creates the missing occurrences first.
export class AgendaLoader {
  private readonly accounts: DashboardAccountReader;
  private readonly invoices: AgendaInvoiceReader;
  private readonly bills: AgendaBillReader;
  private readonly occurrences: AgendaOccurrenceReader;
  private readonly clock: Clock;

  constructor(
    accounts: DashboardAccountReader,
    invoices: AgendaInvoiceReader,
    bills: AgendaBillReader,
    occurrences: AgendaOccurrenceReader,
    clock: Clock,
  ) {
    this.accounts = accounts;
    this.invoices = invoices;
    this.bills = bills;
    this.occurrences = occurrences;
    this.clock = clock;
  }

  // `withSettled`: also what was paid in the month, invoices and occurrences of other months
  // included (for the "Quitadas" and the timeline). In the month of the Livre it also reads the
  // open occurrences of the neighbouring months that fall due by its last day: they count in the
  // Livre as the ones of the month do (BR-DSH-003).
  // `month` is the one asked for; leaving it out reads the current one, with the same reading of
  // the clock that the rest of the load uses (so the day cannot turn between the two).
  async load(input: { month?: Month; withSettled: boolean }): Promise<AgendaLoader.Snapshot> {
    const today = this.clock.today();
    const livreMonth = Month.containing(today);
    const month = input.month ?? livreMonth;

    const [accounts, unpaid, settled, bills, occurrences, dueByEnd, settledAround] =
      await Promise.all([
        this.accounts.listAccounts(),
        this.invoices.listUnpaid(),
        input.withSettled ? this.invoices.listSettledIn(month.value) : Promise.resolve([]),
        this.bills.listBills(),
        this.occurrences.listOfMonth(month.value),
        month.equals(livreMonth)
          ? this.occurrences.listOpenDueBy(livreMonth.value)
          : Promise.resolve([]),
        input.withSettled ? this.occurrences.listSettledAround(month.value) : Promise.resolve([]),
      ]);
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    // One occurrence is one entry: the late ones the month already carries come back in the other
    // reads, and the first read wins.
    const seen = new Set(occurrences.map((occurrence) => occurrence.id));
    const extras = (list: AgendaOccurrence[]) =>
      list.filter((occurrence) => {
        if (seen.has(occurrence.id)) return false;
        seen.add(occurrence.id);

        return true;
      });
    const occurrenceEntries = (occurrence: AgendaOccurrence, isDueInLivre: boolean) => {
      const entry = buildOccurrenceAgendaEntry({
        occurrence,
        isOnCard:
          occurrence.accountId !== null &&
          accountById.get(occurrence.accountId)?.type === 'credit_card',
        livreMonth: livreMonth.value,
        isDueInLivre,
      });

      return entry ? [entry] : [];
    };
    const resolved = resolvePresumedConflicts({ invoices: [...unpaid, ...settled], bills });

    const entries: AgendaEntry[] = [
      ...resolved.invoices.flatMap(({ accountId, invoice }) => {
        const entry = buildInvoiceAgendaEntry({
          accountName: accountById.get(accountId)?.name ?? '',
          invoice,
        });

        return entry ? [entry] : [];
      }),
      ...resolved.bills.map((entry) =>
        buildBillAgendaEntry({ entry, livreEndOn: livreMonth.lastDay().value }),
      ),
      ...occurrences.flatMap((occurrence) => occurrenceEntries(occurrence, false)),
      ...extras(dueByEnd).flatMap((occurrence) => occurrenceEntries(occurrence, true)),
      ...extras(settledAround).flatMap((occurrence) => occurrenceEntries(occurrence, false)),
    ];
    return { today, accounts, entries, occurrences };
  }
}

export namespace AgendaLoader {
  export type Snapshot = {
    // Today in São Paulo.
    today: BusinessDate;
    accounts: AgendaAccount[];
    entries: AgendaEntry[];
    // The occurrences of the month read, skipped ones included.
    occurrences: AgendaOccurrence[];
  };
}
