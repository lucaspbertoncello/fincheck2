import { useState } from 'react';
import { Button as AriaButton, Input, TextField as AriaTextField } from 'react-aria-components';

import { Icon } from '#/components/icons/index.ts';
import { normalizeTag } from '#/components/transactions/edit/normalize-tag.util.ts';
import { cx } from '#/utils/class-names.util.ts';

type TagEditorProps = {
  /** Visible label ("Tags"). */
  label: string;
  tags: readonly string[];
  onChange: (tags: string[]) => void;
  className?: string;
};

/**
 * Tags of a transaction as chips with an "x" (32 px, 44 px touch area) and a field that adds one on
 * Enter. Names are normalized (no "#", lowercase) and never repeat.
 */
export function TagEditor({ label, tags, onChange, className }: TagEditorProps) {
  const [draft, setDraft] = useState('');

  function addDraft() {
    const tag = normalizeTag(draft);
    setDraft('');
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
  }

  return (
    <div className={cx('flex flex-col gap-s8', className)}>
      <span className="text-label text-fg-secondary">{label}</span>
      <div className="flex flex-wrap items-center gap-s8">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-s4 rounded-capsule border border-line pl-s12 text-label text-fg-secondary"
          >
            <Icon name="hash" size="xs" />
            {tag}
            <AriaButton
              aria-label={`Remover a tag ${tag}`}
              onPress={() => onChange(tags.filter((current) => current !== tag))}
              className="focus-ring relative grid size-ctl-sm cursor-pointer place-items-center rounded-capsule text-fg-secondary before:absolute before:-inset-y-s8 before:inset-x-0 before:content-[''] data-[hovered]:text-fg-primary"
            >
              <Icon name="close" size="xs" />
            </AriaButton>
          </span>
        ))}
        <AriaTextField
          aria-label="Adicionar tag"
          value={draft}
          onChange={setDraft}
          className="flex h-ctl-touch items-center gap-s8 field-ring rounded-capsule border border-dashed border-fg-tertiary px-s12"
        >
          <Icon name="plus-circle" size="sm" className="text-fg-secondary" />
          <Input
            placeholder="Adicionar tag"
            enterKeyHint="done"
            autoComplete="off"
            maxLength={24}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addDraft();
              }
            }}
            onBlur={addDraft}
            className="w-32 min-w-0 bg-transparent text-body text-fg-primary outline-none placeholder:text-fg-tertiary lg:text-label"
          />
        </AriaTextField>
      </div>
    </div>
  );
}
