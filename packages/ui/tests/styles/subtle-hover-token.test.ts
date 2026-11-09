import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  composite,
  contrast,
  parseOklch,
  readTokens,
} from '#tests/support/color/oklch-contrast.util.ts';

const tokens = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

function color(map: Map<string, string>, name: string) {
  const parsed = parseOklch(map.get(name) ?? '');
  expect(parsed, `${name} is not an OKLCH color`).not.toBeNull();
  return parsed!;
}

describe('hover of the "…" button (surface.subtle-hover)', () => {
  for (const theme of ['light', 'dark'] as const) {
    const map = readTokens(tokens, theme);
    const page = color(map, '--color-bg-page').rgb;
    const subtle = composite(color(map, '--color-surface-subtle'), page);
    const brandWeak = composite(color(map, '--color-accent-weak'), page);
    const hover = color(map, '--color-surface-subtle-hover');

    it(`is a visible step above the row hover and the selected row in the ${theme} theme`, () => {
      expect(contrast(composite(hover, subtle), subtle)).toBeGreaterThanOrEqual(1.1);
      expect(contrast(composite(hover, brandWeak), brandWeak)).toBeGreaterThanOrEqual(1.1);
    });

    it(`keeps the icon (text.primary) readable on it in the ${theme} theme`, () => {
      const text = color(map, '--color-text-primary').rgb;

      for (const ground of [subtle, brandWeak]) {
        expect(contrast(text, composite(hover, ground))).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
