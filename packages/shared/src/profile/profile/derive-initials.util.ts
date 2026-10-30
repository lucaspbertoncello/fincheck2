import { PROFILE_INITIALS_LIMITS } from './profile.constant.ts';

// The initials of the avatar when the user did not type any: the first letter of the first and of
// the last word of the name, in capitals ("Davi Moreira" -> "DM"). One word gives one letter.
// The same rule runs in the API and in the form preview.
export function deriveInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word));
  const first = words[0];
  const last = words[words.length - 1];

  if (!first || !last) return '?';

  const letters = words.length === 1 ? first.charAt(0) : first.charAt(0) + last.charAt(0);

  return letters.toLocaleUpperCase('pt-BR').slice(0, PROFILE_INITIALS_LIMITS.max);
}
