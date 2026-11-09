import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { PluggyItem } from '#/modules/sync/infra/pluggy/pluggy-item.type.ts';

// The id of the MeuPluggy connector, as the example of the item in
// https://docs.pluggy.ai/pt/reference/items/items-retrieve (read on 09/11/2026); its name is the
// second proof, in case the id ever changes. A body that does not fit is not the MeuPluggy.
const MEU_PLUGGY_CONNECTOR_ID = 200;

export function isMeuPluggyConnector(
  connector: PluggyItem.Response['connector'] | undefined,
): boolean {
  if (!connector || typeof connector !== 'object') return false;

  return (
    Number(connector.id) === MEU_PLUGGY_CONNECTOR_ID ||
    (typeof connector.name === 'string' &&
      normalizeText(connector.name).replace(/\s/g, '') === 'MEUPLUGGY')
  );
}
