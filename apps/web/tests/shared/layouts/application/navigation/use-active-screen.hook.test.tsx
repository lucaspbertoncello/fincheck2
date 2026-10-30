import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderApp } from '#tests/support/app/render-app.util.tsx';

type ViewTransitionParams = { update: () => Promise<void> | void; types: string[] };

function currentTabLabels(): string[] {
  const labels = screen
    .getAllByRole('link', { current: 'page' })
    .map((link) => link.textContent ?? '')
    .filter(Boolean);
  return [...new Set(labels)]; // the top tabs and the bottom bar both carry the five tabs
}

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition');
  vi.unstubAllGlobals();
});

describe('useActiveScreen', () => {
  it('keeps the old tab marked until the view transition runs its update', async () => {
    vi.stubGlobal('CSS', { supports: () => true });
    const atCapture: { types: string[]; current: string[] }[] = [];
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (params: ViewTransitionParams) => {
        // The browser takes the "old" snapshot right here: the bar must still show the old tab.
        atCapture.push({ types: params.types, current: currentTabLabels() });
        return { updateCallbackDone: Promise.resolve(params.update()) };
      },
    });

    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });
    expect(currentTabLabels()).toEqual(['Visão geral']);

    fireEvent.click(screen.getAllByRole('link', { name: 'Transações' })[0]!);
    await screen.findByRole('heading', { level: 1, name: 'Transações' });

    expect(atCapture).toHaveLength(1);
    expect(atCapture[0]?.types).toEqual(['tab', 'fwd']);
    expect(atCapture[0]?.current).toEqual(['Visão geral']);
    expect(currentTabLabels()).toEqual(['Transações']);
  });

  it('also holds the old sub-tab until the transition runs, and slides between sub-tabs', async () => {
    vi.stubGlobal('CSS', { supports: () => true });
    const atCapture: { types: string[]; current: string[] }[] = [];
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (params: ViewTransitionParams) => {
        atCapture.push({
          types: params.types,
          current: screen
            .getAllByRole('link', { current: 'page' })
            .map((link) => link.textContent ?? '')
            .filter((text) => text === 'Recorrências' || text === 'A pagar e receber'),
        });
        return { updateCallbackDone: Promise.resolve(params.update()) };
      },
    });

    renderApp('/recurrences');
    await screen.findByRole('heading', { level: 1, name: 'Recorrentes' });

    fireEvent.click(screen.getByRole('link', { name: 'A pagar e receber' }));
    await screen.findByRole('link', { name: 'A pagar e receber', current: 'page' });

    expect(atCapture).toHaveLength(1);
    expect(atCapture[0]?.types).toEqual(['tab', 'fwd']);
    expect(atCapture[0]?.current).toEqual(['Recorrências']);
  });
});
