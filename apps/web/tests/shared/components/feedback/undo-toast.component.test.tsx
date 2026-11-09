import { ToastProvider, useToast } from '@fincheck/ui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const onUndo = vi.fn();
const onClose = vi.fn();

function Trigger() {
  const { showUndoToast } = useToast();
  return (
    <button
      type="button"
      onClick={() => showUndoToast({ message: 'Transação ignorada.', onUndo, onClose })}
    >
      Ignorar
    </button>
  );
}

function openToast() {
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Ignorar' }));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Toast close', () => {
  it('has a "Fechar aviso" button next to the action', () => {
    openToast();

    expect(screen.getByText('Transação ignorada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar aviso' })).toBeInTheDocument();
  });

  it('hides the toast with the "×" without running the undo', () => {
    openToast();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Transação ignorada.')).not.toBeInTheDocument();
    expect(onUndo).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves with an exit animation, and the undo is no longer offered while it leaves', () => {
    openToast();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));

    const toast = screen.getByRole('alertdialog');
    expect(toast.className).toContain('pop-out');
    expect(toast).toHaveAttribute('inert');
  });

  it('hides the toast with Esc when the focus is on it, without running the undo', () => {
    openToast();

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Transação ignorada.')).not.toBeInTheDocument();
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('still runs the undo and closes with "Desfazer"', () => {
    openToast();

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Transação ignorada.')).not.toBeInTheDocument();
  });

  it('is still closed by the timer', () => {
    openToast();

    act(() => {
      vi.advanceTimersByTime(6100);
    });

    expect(screen.queryByText('Transação ignorada.')).not.toBeInTheDocument();
  });
});
