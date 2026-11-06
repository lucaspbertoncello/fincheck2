import {
  SETTINGS_SECTIONS,
  type SettingsSectionDefinition,
} from '#/shared/constants/settings/settings-sections.constant.ts';

// `Backup` became `Dados` (Polimento 13): the old anchor still lands on the page.
const RENAMED_KEY: Record<string, string> = { backup: 'data' };

/** The section named by an anchor (`#data`, or the old `#backup`), or undefined when it names none. */
export function findSectionByHash(hash: string): SettingsSectionDefinition | undefined {
  const anchor = hash.replace(/^#/, '');
  const key = RENAMED_KEY[anchor] ?? anchor;
  return SETTINGS_SECTIONS.find((section) => section.key === key);
}
