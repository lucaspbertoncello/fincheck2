import { afterEach, describe, expect, it } from 'vitest';

import { focusChosenCategory } from '#/shared/utils/categories/focus-chosen-category.util.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('focusChosenCategory', () => {
  it('focuses the pressed chip of the field that holds the search', () => {
    document.body.innerHTML = `
      <div role="dialog">
        <fieldset>
          <button aria-pressed="false">Mercado</button>
          <button aria-pressed="true">Barbearia</button>
          <div inert><input id="search" /></div>
        </fieldset>
      </div>`;
    const search = document.getElementById('search');
    if (!search) throw new Error('missing search');

    expect(focusChosenCategory(search)).toBe(true);
    expect(document.activeElement).toHaveTextContent('Barbearia');
  });

  it('finds the checked radio of a radio group', () => {
    document.body.innerHTML = `
      <div role="dialog"><div>
        <div role="radiogroup"><input type="radio" id="a" /><input type="radio" id="b" checked /></div>
        <div inert><input id="search" /></div>
      </div></div>`;
    const search = document.getElementById('search');
    if (!search) throw new Error('missing search');

    expect(focusChosenCategory(search)).toBe(true);
    expect(document.activeElement?.id).toBe('b');
  });

  it('does not look outside the dialog, and says so when nothing is chosen', () => {
    document.body.innerHTML = `
      <button aria-pressed="true">Fora</button>
      <div role="dialog"><fieldset><input id="search" /></fieldset></div>`;
    const search = document.getElementById('search');
    if (!search) throw new Error('missing search');

    expect(focusChosenCategory(search)).toBe(false);
  });
});
