import { AmountField, type AmountKind } from '@fincheck/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

function KindField() {
  const [kind, setKind] = useState<AmountKind>('expense');
  return <AmountField cents={0} onChange={() => undefined} kind={kind} onKindChange={setKind} />;
}

describe('Despesa | Receita selector', () => {
  it('keeps one pill that slides to the other side and changes color in the same move', () => {
    const { container } = render(<KindField />);
    const pill = container.querySelector('[data-tone]') as HTMLElement;

    expect(pill).toHaveAttribute('data-tone', 'loss');
    expect(pill.style.transform).toBe('translateX(0%)');
    expect(pill.className).toContain('bg-loss-weak');

    fireEvent.click(screen.getByRole('radio', { name: 'Receita' }));

    // The same element: it transitions (transform and fill) instead of being replaced.
    expect(container.querySelector('[data-tone]')).toBe(pill);
    expect(pill).toHaveAttribute('data-tone', 'gain');
    expect(pill.style.transform).toBe('translateX(100%)');
    expect(pill.className).toContain('bg-gain-weak');
    expect(pill.className).toContain('duration-(--duration-slide)');
    expect(pill.className).toContain('motion-reduce:transition-none');

    fireEvent.click(screen.getByRole('radio', { name: 'Despesa' }));
    expect(container.querySelector('[data-tone]')).toBe(pill);
    expect(pill.style.transform).toBe('translateX(0%)');
  });
});
