import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TotalCard } from '#/components/recurrences/index.ts';

// React warns once per component, so this lives in its own file: a render of the details anywhere
// before it would use up the warning and hide a regression.
describe('TotalCard details and the key warning', () => {
  it('does not spread the key of a detail into the JSX (React warns when it does)', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      renderToStaticMarkup(
        <TotalCard
          label="Despesas fixas"
          totalCents={54259}
          details={[
            { key: 'a', text: 'R$ 200,00 pagos', href: '/x', srHint: 'ver' },
            { key: 'b', text: 'faltam R$ 0,00' },
          ]}
        />,
      );

      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });
});
