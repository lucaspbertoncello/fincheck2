import {
  SETTINGS_SECTIONS,
  type SettingsSectionDefinition,
} from '#/features/settings/settings/constants/settings-sections.constant.ts';

/** The section named by an old anchor (`#backup`), or undefined when the hash names none. */
export function findSectionByHash(hash: string): SettingsSectionDefinition | undefined {
  const key = hash.replace(/^#/, '');
  return SETTINGS_SECTIONS.find((section) => section.key === key);
}
