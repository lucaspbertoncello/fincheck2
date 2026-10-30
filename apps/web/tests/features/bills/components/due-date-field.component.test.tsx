import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DueDateField } from '#/features/bills/components/due-date-field.component.tsx';

describe('DueDateField', () => {
  it('marks "Sem vencimento" when empty and the matching shortcut for a date', () => {
    const { rerender } = render(
      <DueDateField label="Vence em" value="" onChange={() => undefined} today="2026-10-30" />,
    );
    expect(screen.getByRole('button', { name: 'Sem vencimento' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    rerender(
      <DueDateField
        label="Vence em"
        value="2026-10-31"
        onChange={() => undefined}
        today="2026-10-30"
      />,
    );
    expect(screen.getByRole('button', { name: 'Amanhã' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows another date written out on the calendar chip', () => {
    render(
      <DueDateField
        label="Vence em"
        value="2026-12-05"
        onChange={() => undefined}
        today="2026-10-30"
      />,
    );

    expect(screen.getByRole('button', { name: '05/12/2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
