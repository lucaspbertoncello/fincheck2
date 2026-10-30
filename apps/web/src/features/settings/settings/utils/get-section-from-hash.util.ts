import {
  SETTINGS_SECTIONS,
  type SettingsSectionKey,
} from '#/features/settings/settings/constants/settings-sections.constant.ts';

/** The section named by the URL hash (`#backup`); the first section when there is none. */
export function getSectionFromHash(hash: string): SettingsSectionKey {
  const key = hash.replace(/^#/, '');
  return SETTINGS_SECTIONS.find((section) => section.key === key)?.key ?? 'profile';
}
