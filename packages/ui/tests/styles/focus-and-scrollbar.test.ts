import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FIELD_BOX_CLASS } from '#/components/forms/field-classes.constant.ts';
import {
  composite,
  contrast,
  parseOklch,
  readTokens,
  type Rgb,
} from '#tests/support/color/oklch-contrast.util.ts';

const read = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');
const fincheck = read('styles/fincheck.css');
const scrollbar = read('styles/scrollbar.css');
const tokens = read('styles/tokens.css');

function block(css: string, header: string): string {
  const start = css.indexOf(header);
  expect(start, `${header} not found`).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(open + 1, index);
  }
  throw new Error(`${header} is not closed`);
}

function color(map: Map<string, string>, name: string) {
  const parsed = parseOklch(map.get(name) ?? '');
  expect(parsed, `${name} is not an OKLCH color`).not.toBeNull();
  return parsed!;
}

describe('single focus ring of the fields', () => {
  const ring = block(fincheck, '@utility field-ring');

  it('turns the border into the ring: border color plus a 1 px spread, never an outline', () => {
    expect(ring).toContain('border-color');
    expect(ring).toContain('box-shadow: 0 0 0 1px var(--field-ring-color)');
    expect(ring).not.toContain('outline');
  });

  it('rings in the danger color when the field is invalid', () => {
    expect(ring).toMatch(/\[data-invalid\][^}]*--field-ring-color: var\(--color-danger\)/);
  });

  it('follows focus inside the field, so one rule covers input, wrapper and date segments', () => {
    expect(ring).toContain(':focus-within');
  });

  it('animates only border and shadow, never "all"', () => {
    expect(ring).toContain('transition-property: border-color, box-shadow');
  });

  it('is what the field box uses, without a second focus style of its own', () => {
    expect(FIELD_BOX_CLASS).toContain('field-ring');
    expect(FIELD_BOX_CLASS).toContain('outline-none');
    expect(FIELD_BOX_CLASS).not.toMatch(/focus[^ ]*:(outline|border|ring|shadow)/);
    expect(FIELD_BOX_CLASS).not.toContain('data-[focused]');
  });

  it('keeps the border width of the box at 1 px so the focus does not jump the layout', () => {
    expect(FIELD_BOX_CLASS).toContain(' border ');
    expect(FIELD_BOX_CLASS).not.toContain('border-2');
  });
});

describe('contrast of the focus ring', () => {
  for (const theme of ['light', 'dark'] as const) {
    const map = readTokens(tokens, theme);

    it(`is at least 3:1 against the field and the modal in the ${theme} theme`, () => {
      const ring = color(map, '--color-focus-ring').rgb;
      const page = color(map, '--color-bg-page').rgb;
      const field = color(map, '--color-surface-field');
      const modal = color(map, '--color-surface-modal');
      const fieldRgb: Rgb = composite(field, page);
      const modalRgb: Rgb = composite(modal, page);

      expect(contrast(ring, fieldRgb)).toBeGreaterThanOrEqual(3);
      expect(contrast(ring, modalRgb)).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('system scrollbar', () => {
  it('styles Chromium and Safari with the webkit pseudo-elements and a hover that grows', () => {
    expect(scrollbar).toContain('::-webkit-scrollbar-thumb');
    expect(scrollbar).toContain('::-webkit-scrollbar-thumb:hover');
    expect(scrollbar).toContain('border: 3px solid transparent');
    expect(scrollbar).toContain('border-width: 1px');
  });

  it('keeps the track invisible', () => {
    expect(block(scrollbar, '::-webkit-scrollbar-track')).toContain('background: transparent');
  });

  it('gives Firefox the standard properties, behind a query so Chromium keeps the pseudo-elements', () => {
    expect(scrollbar).toContain('@supports not selector(::-webkit-scrollbar)');
    expect(scrollbar).toContain('scrollbar-width: thin');
    expect(scrollbar).toContain('scrollbar-color: var(--color-scrollbar-thumb) transparent');
  });

  it('is loaded by the app stylesheet', () => {
    expect(fincheck).toContain("@import './scrollbar.css'");
  });

  it('uses theme tokens only, defined for both themes', () => {
    expect(scrollbar).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i);
    for (const theme of ['light', 'dark'] as const) {
      const map = readTokens(tokens, theme);
      expect(map.has('--color-scrollbar-thumb')).toBe(true);
      expect(map.has('--color-scrollbar-thumb-hover')).toBe(true);
    }
  });
});
