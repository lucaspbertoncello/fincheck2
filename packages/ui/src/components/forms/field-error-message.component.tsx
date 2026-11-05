import { Text } from 'react-aria-components';

import { Collapse } from '#/components/disclosure/collapse.component.tsx';
import { FIELD_ERROR_CLASS } from '#/components/forms/field-classes.constant.ts';

const HOLE = { s4: '-mt-s4', s8: '-mt-s8' } as const;
const PAD = { s4: 'pt-s4', s8: 'pt-s8' } as const;

type FieldErrorMessageProps = {
  error: string | undefined;
  /** The `gap` of the field's column: the closed line cancels it, the open one gives it back. */
  gap?: keyof typeof HOLE;
  /**
   * Inside a React Aria field the line is its `errorMessage` slot (linked by `aria-describedby`);
   * outside one (a `fieldset`) it is a plain alert.
   */
  inField?: boolean;
};

/**
 * The error line under a field, on the system `Collapse`: it opens once when the error appears,
 * swaps the text without folding while the error changes (typing), and folds when it clears.
 */
export function FieldErrorMessage({ error, gap = 's4', inField = true }: FieldErrorMessageProps) {
  return (
    <Collapse isOpen={Boolean(error)} trackClassName={HOLE[gap]} contentClassName={PAD[gap]}>
      {error ? (
        inField ? (
          <Text slot="errorMessage" className={FIELD_ERROR_CLASS}>
            {error}
          </Text>
        ) : (
          <p role="alert" className={FIELD_ERROR_CLASS}>
            {error}
          </p>
        )
      ) : null}
    </Collapse>
  );
}
