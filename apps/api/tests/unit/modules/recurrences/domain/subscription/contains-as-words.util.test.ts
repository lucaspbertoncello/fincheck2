import { describe, expect, it } from 'vitest';

import { containsAsWords } from '#/modules/recurrences/domain/subscription/contains-as-words.util.ts';

describe('containsAsWords', () => {
  it('finds the pattern as a whole word, at the start, in the middle, at the end and alone', () => {
    expect(containsAsWords('MAX', 'MAX')).toBe(true);
    expect(containsAsWords('MAX *STREAMING', 'MAX')).toBe(true);
    expect(containsAsWords('HBO MAX', 'MAX')).toBe(true);
    expect(containsAsWords('PAG HBO MAX BR', 'MAX')).toBe(true);
  });

  it('does not find it glued to a letter or a digit', () => {
    expect(containsAsWords('MAXXY ACADEMIA', 'MAX')).toBe(false);
    expect(containsAsWords('ULTRAMAX', 'MAX')).toBe(false);
    expect(containsAsWords('MAX2', 'MAX')).toBe(false);
  });

  it('takes a dot, a star, a dash or a space as the end of a word', () => {
    expect(containsAsWords('NETFLIX.COM', 'NETFLIX')).toBe(true);
    expect(containsAsWords('GOOGLE *YOUTUBE', 'YOUTUBE')).toBe(true);
    expect(containsAsWords('SPOTIFY-AB', 'SPOTIFY')).toBe(true);
  });

  it('finds a pattern of several words, and one with punctuation', () => {
    expect(containsAsWords('PIX DE G. PRADO LTDA', 'G. PRADO')).toBe(true);
    expect(containsAsWords('PIX DE G. PRADOS', 'G. PRADO')).toBe(false);
  });

  it('does not take a character of a regular expression for one', () => {
    expect(containsAsWords('A+B', 'A+B')).toBe(true);
    expect(containsAsWords('AAB', 'A+B')).toBe(false);
  });

  it('finds nothing for an empty pattern', () => {
    expect(containsAsWords('ANYTHING', '')).toBe(false);
  });
});
