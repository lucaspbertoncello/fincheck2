import { ContentSkeleton } from '@fincheck/ui';

import { ThemeToggle } from '#/shared/components/theme/theme-toggle.component.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Configurações: no summary panel. The theme toggle stays here until the settings feature exists. */
export function SettingsPage() {
  return (
    <ScreenFrame screen={SCREENS.settings}>
      <section aria-labelledby="appearance-title" className="flex flex-col gap-s12">
        <h2 id="appearance-title" className="font-title text-section font-heading text-fg-primary">
          Aparência
        </h2>
        <div className="flex items-center justify-between gap-s16 border-t border-line pt-s16">
          <div className="flex flex-col">
            <span className="text-body font-emphasis text-fg-primary">Tema</span>
            <span className="text-meta text-fg-secondary">Claro ou escuro</span>
          </div>
          <ThemeToggle />
        </div>
      </section>
      <ContentSkeleton variant="sections" />
    </ScreenFrame>
  );
}
