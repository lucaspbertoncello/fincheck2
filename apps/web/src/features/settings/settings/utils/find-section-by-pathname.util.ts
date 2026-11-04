import {
  SETTINGS_SECTIONS,
  type SettingsSectionDefinition,
} from '#/features/settings/settings/constants/settings-sections.constant.ts';

/** The section whose page is at this pathname (`/settings/backup`), or undefined on `/settings`. */
export function findSectionByPathname(pathname: string): SettingsSectionDefinition | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SETTINGS_SECTIONS.find((section) => section.path === clean);
}
