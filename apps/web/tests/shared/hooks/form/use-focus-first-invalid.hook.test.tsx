import { render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';

function Form({ attempt, scope }: { attempt: number; scope: 'ref' | 'dialog' | 'document' }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusFirstInvalid({
    attempt,
    selector: '[aria-invalid="true"]',
    scope: scope === 'ref' ? ref : scope,
  });
  return (
    <div>
      <input aria-label="outside" aria-invalid="true" />
      <div ref={ref} role="dialog">
        <input aria-label="ok" />
        <input aria-label="bad" aria-invalid="true" />
      </div>
    </div>
  );
}

describe('useFocusFirstInvalid', () => {
  it('does nothing before the first failed attempt', () => {
    const { getByLabelText } = render(<Form attempt={0} scope="ref" />);
    expect(getByLabelText('bad')).not.toHaveFocus();
  });

  it('focuses the first invalid field inside the ref', () => {
    const { getByLabelText } = render(<Form attempt={1} scope="ref" />);
    expect(getByLabelText('bad')).toHaveFocus();
  });

  it('focuses the first invalid field of the open dialog', () => {
    const { getByLabelText } = render(<Form attempt={1} scope="dialog" />);
    expect(getByLabelText('bad')).toHaveFocus();
  });

  it('searches the whole document', () => {
    const { getByLabelText } = render(<Form attempt={1} scope="document" />);
    expect(getByLabelText('outside')).toHaveFocus();
  });
});
