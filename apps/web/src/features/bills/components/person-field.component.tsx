import { Collapse, FieldSet, TextField } from '@fincheck/ui';
import { useState } from 'react';
import { ToggleButton } from 'react-aria-components';

import {
  CHIP_CLASS,
  CHIP_GHOST_CLASS,
  CHIP_ON_CLASS,
} from '#/shared/constants/chip/chip-class.constant.ts';

/** How many recent people show as chips. */
const RECENT_LIMIT = 5;

type PersonFieldProps = {
  label: string;
  /** People already used, most recent first. */
  recent: readonly string[];
  value: string;
  onChange: (name: string) => void;
  error?: string;
};

/**
 * Who the debt is with: the recent people as chips (one tap) and "Nova pessoa" for a name that is
 * not there yet. With nobody recent, the name field is already open.
 */
export function PersonField({ label, recent, value, onChange, error }: PersonFieldProps) {
  const people = recent.slice(0, RECENT_LIMIT);
  const [typing, setTyping] = useState(false);
  const isKnown = people.includes(value);
  const showInput = typing || people.length === 0 || (value !== '' && !isKnown);

  return (
    <FieldSet label={label} error={showInput ? undefined : error}>
      {people.length > 0 ? (
        <div className="flex flex-wrap gap-s8">
          {people.map((name) => {
            const selected = name === value;
            return (
              <ToggleButton
                key={name}
                isSelected={selected}
                onChange={() => {
                  setTyping(false);
                  onChange(selected ? '' : name);
                }}
                className={`${CHIP_CLASS} ${selected ? CHIP_ON_CLASS : ''}`}
              >
                {name}
              </ToggleButton>
            );
          })}
          <ToggleButton
            isSelected={showInput}
            onChange={() => {
              setTyping(true);
              if (isKnown) onChange('');
            }}
            className={`${CHIP_CLASS} ${CHIP_GHOST_CLASS} ${showInput ? CHIP_ON_CLASS : ''}`}
          >
            Nova pessoa
          </ToggleButton>
        </div>
      ) : null}
      <Collapse
        isOpen={showInput}
        bleedY
        contentClassName={people.length > 0 ? 'pt-s8' : undefined}
      >
        <TextField
          label="Nome"
          value={value}
          onChange={onChange}
          error={error}
          maxLength={80}
          autoComplete="off"
          autoFocus={people.length > 0}
        />
      </Collapse>
    </FieldSet>
  );
}
