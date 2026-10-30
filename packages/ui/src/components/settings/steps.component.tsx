import { Icon } from '#/components/icons/icon.component.tsx';
import type { StepItem, StepStatus } from '#/components/settings/step-item.type.ts';
import { cx } from '#/utils/class-names.util.ts';

const CIRCLE_CLASS: Record<StepStatus, string> = {
  done: 'bg-gain-weak text-gain',
  current: 'bg-(image:--gradient-button) text-fg-on-accent shadow-(--shadow-button-inset)',
  todo: 'bg-subtle text-fg-secondary',
};

const SPOKEN_STATUS: Record<StepStatus, string> = {
  done: 'Concluído: ',
  current: 'Passo atual: ',
  todo: 'A fazer: ',
};

type StepsProps = {
  items: StepItem[];
  /** Accessible name of the list ("Passos para conectar o Open Finance"). */
  label: string;
  className?: string;
};

/**
 * Steps (components.md 15): a list of 32 px circles. Done is the weak income fill with a check,
 * the current one has the button gradient and white number, the rest are subtle.
 */
export function Steps({ items, label, className }: StepsProps) {
  return (
    <ol aria-label={label} className={cx('flex flex-col', className)}>
      {items.map((item, index) => (
        <li
          key={item.key}
          aria-current={item.status === 'current' ? 'step' : undefined}
          className="flex gap-s12"
        >
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className={cx(
                'grid size-8 shrink-0 place-items-center rounded-capsule text-label font-emphasis tabular-nums',
                CIRCLE_CLASS[item.status],
              )}
            >
              {item.status === 'done' ? <Icon name="check" size="md" /> : index + 1}
            </span>
            {index < items.length - 1 ? (
              <span aria-hidden="true" className="my-s4 w-px flex-1 bg-line" />
            ) : null}
          </div>
          <div className={cx('flex min-w-0 flex-col pt-s4', index < items.length - 1 && 'pb-s16')}>
            <p
              className={cx(
                'text-body',
                item.status === 'todo' ? 'text-fg-secondary' : 'font-emphasis text-fg-primary',
              )}
            >
              <span className="sr-only">{SPOKEN_STATUS[item.status]}</span>
              {item.title}
            </p>
            {item.description ? (
              <p className="text-meta text-fg-secondary">{item.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
