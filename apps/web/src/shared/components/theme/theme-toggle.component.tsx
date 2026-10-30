import { useState } from 'react';
import { ToggleButton } from 'react-aria-components';

import { getTheme, setTheme } from '#/shared/stores/theme.store.ts';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');

  function handleChange(next: boolean) {
    setIsDark(next);
    setTheme(next ? 'dark' : 'light');
  }

  return (
    <ToggleButton
      isSelected={isDark}
      onChange={handleChange}
      className="rounded-capsule border border-line bg-glass px-s16 py-s8 text-label font-emphasis text-fg-primary outline-none transition-colors data-[focus-visible]:ring-2 data-[focus-visible]:ring-brand data-[hovered]:bg-subtle"
    >
      {isDark ? 'Tema claro' : 'Tema escuro'}
    </ToggleButton>
  );
}
