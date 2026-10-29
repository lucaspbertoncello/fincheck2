import { useHealth } from '#/domain/health/health/hooks/use-health.hook.ts';
import { MoneyText } from '#/shared/components/money/money-text.component.tsx';
import { ThemeToggle } from '#/shared/components/theme/theme-toggle.component.tsx';

export function HomePage() {
  const health = useHealth();

  const statusText = health.isPending
    ? 'Verificando a API…'
    : health.isError
      ? 'API indisponível'
      : health.data.status === 'ok'
        ? 'API funcionando'
        : 'API com falha parcial';

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-s24 px-s16 py-s48">
      <header className="flex items-center justify-between gap-s16">
        <h1 className="font-title text-page-title font-heading tracking-tight text-fg-primary">
          Fincheck
        </h1>
        <ThemeToggle />
      </header>

      <section className="flex flex-col gap-s8 rounded-panel border border-line bg-glass p-s24">
        <p className="text-label text-fg-secondary">Saldo de exemplo</p>
        <MoneyText cents={123456} className="text-money-xl text-fg-primary" />
      </section>

      <p role="status" className="text-meta text-fg-tertiary">
        {statusText}
      </p>
    </main>
  );
}
