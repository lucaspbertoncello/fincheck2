export const PROFILE_NAME_LIMITS = { min: 1, max: 60 } as const;
export const PROFILE_INITIALS_LIMITS = { min: 1, max: 3 } as const;

// The illustrated avatars (Notionists, CC0): a fixed list; the art lives in the front. `null` means the initials.
export const PROFILE_AVATAR_IDS = [
  'notionists-01',
  'notionists-02',
  'notionists-03',
  'notionists-04',
  'notionists-05',
  'notionists-06',
  'notionists-07',
  'notionists-08',
  'notionists-09',
  'notionists-10',
  'notionists-11',
  'notionists-12',
] as const;
