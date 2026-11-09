import { describe, expect, it } from 'vitest';

import { Profile } from '#/modules/profile/domain/profile/profile.entity.ts';

const NOW = '2026-11-08T15:00:00.000Z';
const LATER = '2026-11-08T16:00:00.000Z';

describe('Profile', () => {
  it('has a placeholder for the first opening', () => {
    expect(Profile.placeholder(NOW)).toMatchObject({
      name: 'Você',
      initials: 'V',
      avatarId: null,
      updatedAt: NOW,
    });
  });

  it('derives the initials from the name when they are left out', () => {
    const profile = Profile.placeholder(NOW);
    profile.edit({ name: 'Davi Moreira' }, LATER);

    expect(profile).toMatchObject({ name: 'Davi Moreira', initials: 'DM', updatedAt: LATER });
  });

  it('keeps the initials typed, in capitals', () => {
    const profile = Profile.placeholder(NOW);
    profile.edit({ name: 'Lucas Bertoncello', initials: 'lu' }, LATER);

    expect(profile.initials).toBe('LU');
  });

  it('puts the initials of an accented name in capitals', () => {
    const profile = Profile.placeholder(NOW);
    profile.edit({ name: 'ângela álvares' }, LATER);

    expect(profile.initials).toBe('ÂÁ');
  });

  it('cuts initials that grow in capitals to the limit', () => {
    const profile = Profile.placeholder(NOW);
    profile.edit({ name: 'Lucas', initials: 'ßßß' }, LATER);

    expect(profile.initials).toBe('SSS');
  });

  it('trims the name', () => {
    const profile = Profile.placeholder(NOW);
    profile.edit({ name: '  Lucas  ' }, LATER);

    expect(profile.name).toBe('Lucas');
  });

  it('keeps the avatar when it is left out, sets it, and clears it with null', () => {
    const profile = Profile.placeholder(NOW);

    profile.edit({ name: 'Lucas', avatarId: 'notionists-03' }, LATER);
    expect(profile.avatarId).toBe('notionists-03');

    profile.edit({ name: 'Lucas' }, LATER);
    expect(profile.avatarId).toBe('notionists-03');

    profile.edit({ name: 'Lucas', avatarId: null }, LATER);
    expect(profile.avatarId).toBeNull();
  });
});
