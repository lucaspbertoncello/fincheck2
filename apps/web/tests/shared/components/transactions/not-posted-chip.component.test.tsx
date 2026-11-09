import { TransactionRow } from '@fincheck/ui';
import type { TransactionRowData } from '@fincheck/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

const EXPLANATION =
  'O banco ainda não lançou esta compra. Ela já conta na fatura; o selo some quando o banco lançar.';

const ROW: TransactionRowData = {
  id: 'trx-1',
  name: 'Anthropic* Claude Sub',
  amountCents: -10000,
  kind: 'expense',
  categoryIcon: 'tag',
  categoryNames: ['Assinaturas'],
  accountLabel: 'Nubank, crédito',
  pending: true,
};

function renderRow() {
  return render(
    <ul>
      <TransactionRow transaction={ROW} />
    </ul>,
  );
}

describe('"Não lançada" chip of a transaction row', () => {
  it('says "Não lançada" on a button, never "Pendente"', () => {
    renderRow();

    expect(screen.getByRole('button', { name: 'Não lançada' })).toBeInTheDocument();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('explains itself on keyboard focus and hides on Esc', async () => {
    const user = userEvent.setup();
    renderRow();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Não lançada' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(EXPLANATION);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('explains itself on hover', async () => {
    renderRow();
    const chip = screen.getByRole('button', { name: 'Não lançada' });

    // The mouse moves in (the modality becomes "pointer"), and the tip comes after its wait.
    fireEvent.pointerMove(chip, { pointerType: 'mouse', pointerId: 1 });
    fireEvent.pointerEnter(chip, { pointerType: 'mouse', pointerId: 1 });

    expect(await screen.findByRole('tooltip', undefined, { timeout: 2000 })).toHaveTextContent(
      EXPLANATION,
    );
  });

  it('opens on a screen reader click (virtual pointer) too', async () => {
    renderRow();
    const chip = screen.getByRole('button', { name: 'Não lançada' });

    fireEvent.pointerDown(chip, { pointerType: 'virtual', pointerId: 1, isPrimary: true });
    fireEvent.pointerUp(chip, { pointerType: 'virtual', pointerId: 1, isPrimary: true });
    fireEvent.click(chip, { detail: 0 });

    expect(await screen.findByRole('tooltip')).toHaveTextContent(EXPLANATION);
  });

  it('opens on a tap and closes on a second tap or a tap elsewhere', async () => {
    renderRow();
    const chip = screen.getByRole('button', { name: 'Não lançada' });
    const tap = (target: Element) => {
      fireEvent.pointerDown(target, { pointerType: 'touch', pointerId: 1, isPrimary: true });
      fireEvent.pointerUp(target, { pointerType: 'touch', pointerId: 1, isPrimary: true });
      fireEvent.click(target, { detail: 1 });
    };

    tap(chip);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(EXPLANATION);

    tap(chip);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    tap(chip);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
