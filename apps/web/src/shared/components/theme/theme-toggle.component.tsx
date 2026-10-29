import { useState } from 'react';
import { ToggleButton } from 'react-aria-components';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );

  function handleChange(next: boolean) {
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
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
