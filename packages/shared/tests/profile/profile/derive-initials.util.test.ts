import { describe, expect, it } from 'vitest';

import { deriveInitials } from '#/profile/profile/derive-initials.util.ts';

describe('deriveInitials', () => {
  it('takes the first letter of the first and of the last word', () => {
    expect(deriveInitials('Davi Moreira')).toBe('DM');
    expect(deriveInitials('Ana Maria de Souza')).toBe('AS');
  });

  it('gives one letter for one word, in capitals', () => {
    expect(deriveInitials('davi')).toBe('D');
  });

  it('keeps accented capitals and ignores extra spaces', () => {
    expect(deriveInitials('  érica   álvares ')).toBe('ÉÁ');
  });

  it('falls back to a question mark when there is no letter', () => {
    expect(deriveInitials('  ')).toBe('?');
    expect(deriveInitials('123')).toBe('?');
  });
});
