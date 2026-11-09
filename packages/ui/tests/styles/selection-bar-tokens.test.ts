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

describe('selection bar surface', () => {
  for (const theme of ['light', 'dark'] as const) {
    const map = readTokens(tokens, theme);
    const bar = color(map, '--color-surface-selection-bar');

    it(`is almost opaque in the ${theme} theme, so what scrolls under it does not show through`, () => {
      expect(bar.alpha).toBeGreaterThanOrEqual(0.9);
    });

    it(`keeps the text at 4.5:1 and the icons at 3:1 over the worst thing that can scroll under it, in the ${theme} theme`, () => {
      // The page, its tinted top and the strongest ink the page has (a row's text), all under the bar.
      const grounds = [
        '--color-bg-page',
        '--color-bg-top',
        '--color-text-primary',
        '--color-surface-modal',
      ];
      for (const ground of grounds) {
        const surface = composite(bar, color(map, ground).rgb);
        expect(
          contrast(color(map, '--color-text-primary').rgb, surface),
          ground,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(color(map, '--color-accent-default').rgb, surface),
          ground,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
