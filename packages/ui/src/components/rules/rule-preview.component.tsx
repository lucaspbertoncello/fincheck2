import { Money } from '#/components/money/index.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { RulePreviewData } from '#/components/rules/rule-preview.type.ts';

/** Preview of the history transactions a rule matches (components.md 9.1): subtle box, 3 columns. */
export function RulePreview({
  preview,
  className,
}: {
  preview: RulePreviewData;
  className?: string;
}) {
  return (
    <div className={cx('rounded-input bg-subtle p-s16 text-label', className)}>
      <p className="text-fg-secondary">{preview.title}</p>
      <ul className="mt-s12 flex flex-col gap-s8">
        {preview.matches.map((match) => (
          <li key={match.id} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-s16">
            <span className="min-w-0 truncate text-fg-primary">{match.description}</span>
            <span className="text-fg-secondary tabular-nums">{match.dateLabel}</span>
            <Money
              cents={match.cents}
              sign="none"
              weight="plain"
              tone={match.tone}
              className="justify-self-end"
            />
          </li>
        ))}
      </ul>
      {preview.moreCount ? (
        <p className="mt-s8 text-fg-secondary">e mais {preview.moreCount}</p>
      ) : null}
    </div>
  );
}
