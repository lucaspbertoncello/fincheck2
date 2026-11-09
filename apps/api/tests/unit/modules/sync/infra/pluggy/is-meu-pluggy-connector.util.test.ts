import { describe, expect, it } from 'vitest';

import { isMeuPluggyConnector } from '#/modules/sync/infra/pluggy/is-meu-pluggy-connector.util.ts';

describe('isMeuPluggyConnector', () => {
  it.each([
    [{ id: 200, name: 'Qualquer' }],
    [{ id: '200', name: 'Qualquer' }],
    [{ id: 1, name: 'MeuPluggy' }],
    [{ id: 1, name: 'Meu Pluggy' }],
  ])('%j is the MeuPluggy', (connector) => {
    expect(isMeuPluggyConnector(connector)).toBe(true);
  });

  it.each([[{ id: 601, name: 'Itaú' }], [undefined], [null as never], ['x' as never]])(
    '%j is not',
    (connector) => {
      expect(isMeuPluggyConnector(connector)).toBe(false);
    },
  );
});
