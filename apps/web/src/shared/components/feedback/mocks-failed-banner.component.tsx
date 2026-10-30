import { Banner } from '@fincheck/ui';

/**
 * Notice of the mocks mode when the MSW worker did not start: the app opens anyway, but the simulated
 * data never arrives. Only `main.tsx` mounts it, and only in `pnpm dev:mocks`.
 */
export function MocksFailedBanner() {
  return (
    <div className="mx-auto w-full max-w-7xl px-gutter-mobile pt-s16 lg:px-gutter">
      <Banner
        variant="warning"
        title="Os dados simulados não carregaram"
        description="O navegador não registrou o service worker do MSW, então as telas ficam sem dados. Abra o endereço num navegador comum (Chrome, Edge ou Firefox) fora de um painel embutido."
      />
    </div>
  );
}
