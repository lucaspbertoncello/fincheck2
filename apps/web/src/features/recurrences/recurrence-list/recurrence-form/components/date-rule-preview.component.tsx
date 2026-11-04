import { useId } from 'react';

import { RuleGroupHeading } from '#/features/recurrences/recurrence-list/recurrence-form/components/rule-group-heading.component.tsx';
import type {
  PreviewDate,
  PreviewStatus,
} from '#/features/recurrences/recurrence-list/recurrence-form/types/preview-date.type.ts';

type DateRulePreviewProps = {
  /** `ready` shows the dates; `loading` keeps their place while the next ones arrive. */
  status: PreviewStatus;
  dates: readonly PreviewDate[];
  /** A number of the rule is wrong: said here, where the dates would be. */
  error?: string;
};

const ROWS = [0, 1, 2] as const;

/**
 * The proof of the rule: the next three dates with the weekday, the first one marked, and for the
 * rules with a margin the days the payment may arrive in. The box keeps its height in every state
 * (dates, loading, incomplete rule, no answer, error) so nothing around it moves. A quiet live region reads
 * the new dates after each change.
 */
export function DateRulePreview({ status, dates, error }: DateRulePreviewProps) {
  const titleId = useId();
  const announcement =
    status === 'ready' && dates.length > 0
      ? `Próximas datas: ${dates.map((date) => date.label).join('; ')}.`
      : '';

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-s8">
      <RuleGroupHeading id={titleId}>Próximas datas</RuleGroupHeading>
      <div className="min-h-[5.125rem] flex-1 rounded-input border border-line bg-subtle p-s4">
        {error ? (
          <p role="alert" className="flex h-full items-center px-s8 text-meta text-alert">
            {error}
          </p>
        ) : status === 'incomplete' ? (
          <p className="flex h-full items-center px-s8 text-meta text-fg-tertiary">
            Complete a regra e as próximas datas aparecem aqui.
          </p>
        ) : status === 'unavailable' ? (
          <p className="flex h-full items-center px-s8 text-meta text-fg-tertiary">
            Não deu para calcular as datas agora. A regra continua valendo.
          </p>
        ) : status === 'loading' ? (
          <div aria-hidden="true" className="flex h-full flex-col justify-between">
            {ROWS.map((row) => (
              <span key={row} className="h-6 animate-pulse rounded-input bg-line" />
            ))}
          </div>
        ) : (
          <ul aria-labelledby={titleId} className="flex h-full flex-col justify-between">
            {dates.map((date, index) => (
              <li
                key={date.key}
                aria-label={date.label}
                className={`flex h-6 items-center justify-between gap-s8 rounded-input px-s8 text-label ${
                  index === 0 ? 'bg-brand-weak font-emphasis text-brand' : 'text-fg-primary'
                }`}
              >
                <span aria-hidden="true" className="min-w-0 truncate tabular-nums">
                  {date.weekday ? `${date.weekday}, ${date.dayMonth}` : date.dayMonth}
                </span>
                {date.note ? (
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-meta font-plain tabular-nums ${
                      index === 0 ? 'text-brand' : 'text-fg-secondary'
                    }`}
                  >
                    {date.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
