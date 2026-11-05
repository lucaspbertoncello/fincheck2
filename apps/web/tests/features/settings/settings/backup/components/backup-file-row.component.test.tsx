import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BackupFileRow } from '#/features/settings/settings/backup/components/backup-file-row.component.tsx';

const FILE = {
  fileName: 'a.bak',
  moment: 'Ontem às 03:00',
  size: '14,2 MB',
  day: '04/11',
  isLatest: true,
};

const noop = () => undefined;

describe('BackupFileRow', () => {
  it('has an icon, the moment with its badge and the size as the detail', () => {
    const html = renderToStaticMarkup(
      <BackupFileRow file={FILE} isDisabled={false} onRestore={noop} />,
    );

    expect(html.startsWith('<li ')).toBe(true);
    expect(html).toContain('Ontem às 03:00');
    expect(html).toContain('Mais recente');
    expect(html).toContain('14,2 MB');
    expect(html).toContain('size-9');
  });

  it('puts "Restaurar" on the strip, never at the right end', () => {
    const html = renderToStaticMarkup(
      <BackupFileRow file={FILE} isDisabled={false} onRestore={noop} />,
    );

    expect(html).toContain('col-start-1 row-start-3');
    expect(html).toContain('lg:col-start-2');
    expect(html).toContain('Restaurar');
    expect(html).toContain('o backup de Ontem às 03:00');
    expect(html).not.toContain('col-start-3 row-start-1');
  });

  it('has no badge on an older backup', () => {
    const html = renderToStaticMarkup(
      <BackupFileRow file={{ ...FILE, isLatest: false }} isDisabled onRestore={noop} />,
    );

    expect(html).not.toContain('Mais recente');
  });
});
