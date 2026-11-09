import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Chip } from '#/components/chips/index.ts';
import { ListRow, type ListRowBadges } from '#/components/list-row/index.ts';

function render(props: Partial<Parameters<typeof ListRow>[0]> = {}) {
  return renderToStaticMarkup(
    <ul>
      <ListRow
        mark={<span data-testid="mark">M</span>}
        name="Internet Fibra"
        detail="Todo dia 20 · Nubank"
        value={<span>VALUE</span>}
        {...props}
      />
    </ul>,
  );
}

describe('ListRow', () => {
  it('puts the mark first, then the text, and the value at the right end', () => {
    const html = render({ menu: <button type="button">MENU</button> });

    expect(html.indexOf('>M<')).toBeLessThan(html.indexOf('Internet Fibra'));
    expect(html.indexOf('Internet Fibra')).toBeLessThan(html.indexOf('VALUE'));
    expect(html.indexOf('VALUE')).toBeLessThan(html.indexOf('MENU'));
    expect(html).toContain('col-start-3 row-start-1');
    expect(html).toContain('col-start-4');
  });

  it('centers the mark against the name and detail block, not the first line', () => {
    const mark = /<div class="([^"]*)"><span data-testid="mark">/.exec(render());
    expect(mark?.[1]).toContain('self-center');
    expect(mark?.[1]).toContain('row-span-2');
    expect(mark?.[1]).not.toContain('self-start');
  });

  it('puts the actions on a strip of their own, aligned with the text and not with the mark', () => {
    const html = render({ actions: <button type="button">Registrar pagamento</button> });

    const strip = /<div class="([^"]*)"><button type="button">Registrar pagamento/.exec(html);
    expect(strip?.[1]).toContain('lg:col-start-2');
    expect(strip?.[1]).toContain('col-start-1');
    expect(strip?.[1]).toContain('-col-end-1');
    expect(strip?.[1]).toContain('flex-wrap');
    // The row leaves a scale step (16) between the strip and the divider.
    expect(html).toContain('pb-s16');
  });

  it('has no strip, and no extra bottom space, without actions', () => {
    const html = render();

    expect(html).not.toContain('lg:col-start-2');
    expect(html).not.toContain('pb-s16');
  });

  it('shows at most two badges', () => {
    const three = [
      <Chip key="a">Um</Chip>,
      <Chip key="b">Dois</Chip>,
      <Chip key="c">Três</Chip>,
    ] as unknown as ListRowBadges;
    const html = render({ badges: three });

    expect(html).toContain('Um');
    expect(html).toContain('Dois');
    expect(html).not.toContain('Três');
  });

  it('writes a composed value in two lines: the main value, then the smaller reference', () => {
    const html = render({ value: <span>R$ 400</span>, valueNote: 'de R$ 800' });

    expect(html.indexOf('R$ 400')).toBeLessThan(html.indexOf('de R$ 800'));
    expect(html).toContain('col-start-3 row-start-2');
    expect(html).toContain('text-meta');
    expect(html).toContain('whitespace-nowrap');
  });

  it('truncates a long name and detail with a title, and never wraps them', () => {
    const html = render({ name: 'Mensalidade do curso de especialização', detailTitle: 'tudo' });

    expect(html).toContain('title="Mensalidade do curso de especialização"');
    expect(html).toContain('title="tudo"');
    expect(html).toContain('truncate');
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('lg:line-clamp-1');
  });

  it('makes the name a real button when it opens something', () => {
    const html = render({ onOpen: () => undefined, openLabel: 'Editar Internet Fibra' });

    expect(html).toContain('<button');
    expect(html).toContain('aria-label="Editar Internet Fibra"');
  });

  it('never underlines the name on hover; only the keyboard focus does', () => {
    const html = render({ onOpen: () => undefined, openLabel: 'Abrir Internet Fibra' });
    const button = /<button[^>]*class="([^"]*)"/.exec(html);

    expect(button?.[1]).not.toMatch(/hover[^ ]*underline|(^| )underline( |$)/);
    expect(html).not.toContain('group-hover/row:underline');
    expect(button?.[1]).toContain('focus-visible:underline');
  });

  it('draws the hover background on a layer that bleeds 8 px past the row, behind the content', () => {
    const html = render({ onOpen: () => undefined, openLabel: 'Abrir Internet Fibra' });
    const row = /<li class="([^"]*)"/.exec(html)?.[1] ?? '';

    expect(row).toContain('before:-inset-x-s8');
    expect(row).toContain('before:inset-y-0');
    expect(row).toContain('before:-z-10');
    expect(row).toContain('before:rounded-input');
    expect(row).toContain('isolate');
    expect(row).toContain('hover:before:bg-subtle');
    // the row itself carries no background and no horizontal padding: the content keeps its alignment
    expect(row).not.toMatch(/(^| )(bg-subtle|px-s\d+|-mx-s\d+)( |$)/);
    // the focus ring draws inside the layer, so a clipping parent never cuts it
    expect(row).toContain('has-[:focus-visible]:before:-outline-offset-2');
    // the name button stretches over the layer too, so a click on the inset also opens the row
    expect(html).toContain('after:-inset-x-s8');
  });

  it('keeps the "…" button and the mark inside the background: no negative margin on the menu', () => {
    const html = render({ menu: <button type="button">MENU</button> });
    const menu = /<div class="([^"]*)"><button type="button">MENU/.exec(html)?.[1] ?? '';

    expect(menu).toContain('col-start-4');
    expect(menu).not.toMatch(/-mr-s\d+/);
    expect(menu).not.toMatch(/-ml-s\d+/);
  });

  it('a selected row paints brand-weak on the same bleeding layer, with no hover background over it', () => {
    const html = render({ selected: true });
    const row = /<li class="([^"]*)"/.exec(html)?.[1] ?? '';

    expect(row).toContain('before:-inset-x-s8');
    expect(row).toContain('before:bg-brand-weak');
    expect(row).not.toContain('hover:before:bg-subtle');
    expect(row).not.toMatch(/(^| )bg-brand-weak( |$)/);
  });

  it('has no background layer when the row neither opens nor is selected', () => {
    const row = /<li class="([^"]*)"/.exec(render())?.[1] ?? '';

    expect(row).not.toContain('before:');
    expect(row).not.toContain('isolate');
  });

  it('keeps the same layout on the phone: no breakpoint changes the columns', () => {
    const html = render({ actions: <button type="button">Ok</button> });

    expect(html).toContain('grid-cols-[auto_minmax(0,1fr)_auto_auto]');
    expect(html).not.toMatch(/(sm|md|lg):grid-cols/);
  });

  it('keeps the mark in the first column and lets the detail run to the right edge, under the value', () => {
    const html = render({ menu: <button type="button">MENU</button> });

    expect(html).toContain('col-start-1 row-start-1 mr-s12 self-center');
    expect(html).toMatch(/<p[^>]*col-start-2 row-start-2[^>]*-col-end-1/);
  });

  it('with a value note the detail stops before the value column, so they never overlap', () => {
    const html = render({ valueNote: 'de R$ 800' });

    expect(html).toMatch(/<p[^>]*col-start-2 row-start-2/);
    expect(html).not.toMatch(/<p[^>]*row-start-2[^>]*-col-end-1/);
    expect(html).toContain('col-start-3 row-start-2');
  });
  it('folds the strip with the Collapse when `actionsOpen` is given, taking no room while closed', () => {
    const open = render({ actions: <button type="button">Atualizar</button>, actionsOpen: true });
    const closed = render({ actions: null, actionsOpen: false });

    expect(open).toContain('grid-rows-[1fr]');
    expect(open).toContain('-mt-s4');
    expect(open).toContain('lg:col-start-2');
    expect(open).toContain('Atualizar');
    // the space under the strip lives inside the fold, not as a padding of the row
    expect(open).not.toContain('pb-s16');
    expect(closed).toContain('grid-rows-[0fr]');
    expect(closed).toContain('inert');
    expect(closed).not.toContain('Atualizar');
  });

  it('can be a div when the caller already wraps the row in an li', () => {
    const html = renderToStaticMarkup(
      <ul>
        <li>
          <ListRow as="div" mark={<span>M</span>} name="Streaming" />
        </li>
      </ul>,
    );

    expect(html).toMatch(/<li><div class="grid /);
    expect(html.match(/<li/g)).toHaveLength(1);
  });
});
