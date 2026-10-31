import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { HEATMAP_LEVEL_CLASS } from '#/components/heatmap/heatmap-level.constant.ts';
import {
  composite,
  contrast,
  parseOklch,
  readTokens,
} from '#tests/support/color/oklch-contrast.util.ts';

const read = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');
const tokens = read('styles/tokens.css');
const scrollbar = read('styles/scrollbar.css');

function color(map: Map<string, string>, name: string) {
  const parsed = parseOklch(map.get(name) ?? '');
  expect(parsed, `${name} is not an OKLCH color`).not.toBeNull();
  return parsed!;
}

describe('spend map levels', () => {
  it('fills levels 1 to 4 from the heatmap tokens, not from a mix of the brand color', () => {
    for (const level of [1, 2, 3, 4] as const) {
      expect(HEATMAP_LEVEL_CLASS[level]).toBe(`bg-(--color-heatmap-${level})`);
    }
  });

  for (const theme of ['light', 'dark'] as const) {
    const map = readTokens(tokens, theme);

    it(`defines the four levels in the ${theme} theme, each stronger than the one before`, () => {
      const page = color(map, '--color-bg-page').rgb;
      const card = composite(color(map, '--color-surface-glass'), page);
      const ratios = [1, 2, 3, 4].map((level) =>
        contrast(color(map, `--color-heatmap-${level}`).rgb, card),
      );

      expect(ratios).toEqual([...ratios].sort((a, b) => a - b));
    });

    it(`keeps level 1 at 3:1 or more against the card, on the page and at the tinted top, in the ${theme} theme`, () => {
      const glass = color(map, '--color-surface-glass');
      const level1 = color(map, '--color-heatmap-1').rgb;

      for (const ground of ['--color-bg-page', '--color-bg-top']) {
        const card = composite(glass, color(map, ground).rgb);
        expect(contrast(level1, card), ground).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

describe('scrollbar gutter', () => {
  it('stays reserved on the page, so a short screen does not shift against a long one', () => {
    expect(scrollbar).toMatch(/html\s*\{[^}]*scrollbar-gutter:\s*stable/);
  });
});
