import { createHash, timingSafeEqual } from 'node:crypto';

// Compares the token received with the real one in constant time. Both go through SHA-256 first,
// so they have the same length and the comparison time says nothing about where they differ.
export function localTokenMatches(received: string | undefined, expected: string): boolean {
  if (received === undefined) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();

  return timingSafeEqual(digest(received), digest(expected));
}
