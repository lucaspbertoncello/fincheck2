import { SegmentedNav, type SegmentedNavItem } from '@fincheck/ui';

import { SCREENS } from '#/shared/constants/screens.constant.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';

const GROUPS = {
  recurrences: {
    label: 'Seções de Recorrentes',
    items: [
      { key: 'recurrences', label: 'Recorrências', icon: 'repeat' },
      { key: 'bills', label: 'A pagar e receber', icon: 'calendar' },
      { key: 'subscriptions', label: 'Assinaturas', icon: 'subscription' },
    ],
  },
  categories: {
    label: 'Seções de Categorias',
    items: [
      { key: 'categories', label: 'Categorias', icon: 'tag' },
      { key: 'rules', label: 'Regras', icon: 'magic' },
    ],
  },
} as const;

type ScreenSubNavProps = {
  group: keyof typeof GROUPS;
};

/** Sub-tabs under the header: Recorrências | A pagar e receber | Assinaturas, Categorias | Regras. */
export function ScreenSubNav({ group }: ScreenSubNavProps) {
  const { screen, monthParam } = useActiveScreen();
  const { label, items } = GROUPS[group];
  const links: SegmentedNavItem[] = items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    href: buildHref(SCREENS[item.key].path, monthParam),
  }));

  return <SegmentedNav items={links} activeKey={screen.key} label={label} />;
}
