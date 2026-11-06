import { CategoryPicker, Collapse, FieldSet, Icon } from '@fincheck/ui';
import type { CategoryOption, IconName } from '@fincheck/ui';
import { useEffect, useRef, useState } from 'react';
import { Label, Radio, RadioGroup } from 'react-aria-components';

type CategoryChipsProps = {
  label: string;
  /** Every category of the type, the most used first. */
  categories: readonly CategoryOption[];
  value: string | null;
  onChange: (categoryId: string) => void;
  className?: string;
};

const OTHERS_KEY = 'others';
const SHOWN = 2;

type ChipOption = { key: string; label: string; icon: IconName };

/**
 * Category as touch shortcuts: the two most used of the type as chips with their icon, then
 * "Outras…", which opens the search for the rest. A category picked from the search takes the place
 * of the second chip, so the choice is always visible. The chips stay on ONE row, so the column has
 * room for "É assinatura" and the modal keeps its height at 1280×720 (Lucas, 06/11/2026): when two
 * long names do not fit beside "Outras…", only one shortcut shows; no name is ever cut.
 */
export function CategoryChips({
  label,
  categories,
  value,
  onChange,
  className,
}: CategoryChipsProps) {
  const [searching, setSearching] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  // The list and the choice the fit was measured for: when either changes, back to two shortcuts.
  const fitKey = `${categories.map((category) => category.id).join()}|${value ?? ''}`;
  const [fit, setFit] = useState({ key: fitKey, limit: SHOWN });
  const limit = fit.key === fitKey ? fit.limit : SHOWN;

  // Two long names that wrap beside "Outras…" leave one shortcut, so the row never grows.
  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const first = row.firstElementChild;
      if (first && row.scrollHeight > first.getBoundingClientRect().height + 1) {
        setFit({ key: fitKey, limit: 1 });
      }
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [fitKey]);

  if (categories.length === 0) {
    return (
      <FieldSet label={label} className={className}>
        <p className="text-meta text-fg-tertiary">Nenhuma categoria deste tipo ainda.</p>
      </FieldSet>
    );
  }

  const top = categories.slice(0, limit);
  const chosen = categories.find((category) => category.id === value);
  // A category picked from the search takes the last place, so the row keeps its length and height.
  const shown = chosen && !top.includes(chosen) ? [...top.slice(0, limit - 1), chosen] : top;
  const options: ChipOption[] = shown.map((category) => ({
    key: category.id,
    label: category.name,
    icon: category.icon,
  }));
  if (categories.length > shown.length) {
    options.push({ key: OTHERS_KEY, label: 'Outras…', icon: 'search' });
  }

  return (
    <div className={`flex flex-col ${className ?? ''}`}>
      <RadioGroup
        value={searching ? OTHERS_KEY : value}
        onChange={(key) => {
          if (key === OTHERS_KEY) return setSearching(true);
          setSearching(false);
          onChange(key);
        }}
        className="flex flex-col gap-s4"
      >
        <Label className="text-label text-fg-secondary">{label}</Label>
        <div ref={rowRef} className="flex flex-wrap gap-s8">
          {options.map((option) => (
            <Radio
              key={option.key}
              value={option.key}
              className="focus-ring inline-flex h-ctl-tab cursor-pointer items-center gap-s4 rounded-capsule border border-line px-s12 text-label whitespace-nowrap text-fg-primary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[hovered]:bg-subtle data-[pressed]:scale-96 data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:text-brand"
            >
              <Icon name={option.icon} size="sm" />
              {option.label}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <Collapse isOpen={searching} contentClassName="pt-s8">
        <CategoryPicker
          label="Buscar outra categoria"
          categories={categories}
          value={value}
          autoFocus
          onChange={(categoryId) => {
            if (categoryId === null) return;
            setSearching(false);
            onChange(categoryId);
          }}
        />
      </Collapse>
    </div>
  );
}
