import { Button, MoneyVisibilityContext, ToastProvider } from '@fincheck/ui';
import { useEffect, useState } from 'react';

import { GALLERY_GROUPS } from '../../constants/gallery-groups.constant.ts';
import { GallerySection } from './gallery-section.component.tsx';

type Theme = 'light' | 'dark';
const THEME_KEY = 'fincheck:gallery-theme';

function initialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Blocked storage: fall through to the system theme.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialGroup(): string {
  const id = window.location.hash.slice(1);
  return GALLERY_GROUPS.some((group) => group.id === id) ? id : GALLERY_GROUPS[0]!.id;
}

/** Dev-only gallery: every export of `@fincheck/ui`, by group, in both themes. */
export function GalleryApp() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [hidden, setHidden] = useState(false);
  const [groupId, setGroupId] = useState(initialGroup);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage is a convenience only.
    }
  }, [theme]);

  useEffect(() => {
    // On the phone the index is a sideways strip: keep the current group in view.
    document
      .querySelector('nav [aria-current]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [groupId]);

  const group = GALLERY_GROUPS.find((item) => item.id === groupId) ?? GALLERY_GROUPS[0]!;

  const selectGroup = (id: string) => {
    setGroupId(id);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <MoneyVisibilityContext.Provider value={hidden}>
      <ToastProvider>
        <header className="sticky top-0 z-(--z-tooltip) flex flex-wrap items-center gap-x-s16 gap-y-s8 border-b border-line bg-page px-s16 py-s8 lg:px-s24">
          <h1 className="font-title font-heading text-section text-fg-primary">
            Vitrine{' '}
            <span className="hidden text-label font-plain text-fg-secondary sm:inline">
              @fincheck/ui
            </span>
          </h1>
          <div className="ml-auto flex gap-s8">
            <Button
              variant="secondary"
              size="sm"
              icon={theme === 'dark' ? 'sun' : 'moon'}
              onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={hidden ? 'eye' : 'eye-off'}
              onPress={() => setHidden(!hidden)}
            >
              {hidden ? 'Mostrar' : 'Ocultar'}
              <span className="hidden sm:inline"> valores</span>
            </Button>
          </div>
        </header>
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
          <nav
            aria-label="Grupos e componentes"
            className="sticky top-[calc(var(--spacing-s8)*2+var(--spacing-ctl-sm))] z-(--z-raised) border-b border-line bg-page lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-r lg:border-b-0"
          >
            <ul className="m-0 flex list-none gap-s4 overflow-x-auto p-s8 lg:flex-col lg:p-s16">
              {GALLERY_GROUPS.map((item) => {
                const active = item.id === group.id;
                return (
                  <li key={item.id} className="shrink-0">
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => selectGroup(item.id)}
                      className={`h-ctl-touch w-full cursor-pointer rounded-capsule px-s16 text-left text-label whitespace-nowrap ${
                        active
                          ? 'bg-brand-weak font-emphasis text-brand'
                          : 'text-fg-secondary hover:bg-subtle'
                      }`}
                    >
                      {item.title}
                    </button>
                    {active ? (
                      <ul className="m-0 mb-s8 hidden list-none p-0 pl-s16 lg:block">
                        {item.sections.map((section) => (
                          <li key={section.id}>
                            <a
                              href={`#${item.id}`}
                              onClick={(event) => {
                                event.preventDefault();
                                document
                                  .getElementById(section.id)
                                  ?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="block py-s4 text-meta text-fg-secondary hover:text-brand"
                            >
                              {section.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
          <main className="min-w-0 px-s16 py-s24 lg:px-s32">
            <h2 className="mb-s24 font-title font-heading text-page-title text-fg-primary">
              {group.title}
            </h2>
            <div className="flex flex-col gap-s48">
              {group.sections.map((section) => (
                <GallerySection key={section.id} id={section.id} title={section.title}>
                  {section.content}
                </GallerySection>
              ))}
            </div>
          </main>
        </div>
      </ToastProvider>
    </MoneyVisibilityContext.Provider>
  );
}
