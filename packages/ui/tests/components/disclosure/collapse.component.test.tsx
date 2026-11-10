import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Collapse } from '#/components/disclosure/index.ts';

describe('Collapse', () => {
  it('closed: collapsed track, transparent, inert and out of the accessibility tree', () => {
    const html = renderToStaticMarkup(
      <Collapse isOpen={false} id="panel">
        <p>Detalhe</p>
      </Collapse>,
    );

    expect(html).toContain('grid-rows-[0fr]');
    expect(html).toContain('opacity-0');
    expect(html).toContain('inert=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('id="panel"');
  });

  it('closed: does not mount the children until the first opening', () => {
    const html = renderToStaticMarkup(
      <Collapse isOpen={false}>
        <p>Detalhe</p>
      </Collapse>,
    );

    expect(html).not.toContain('Detalhe');
  });

  it('keeps the children mounted while closed when asked to', () => {
    const html = renderToStaticMarkup(
      <Collapse isOpen={false} keepMounted>
        <p>Detalhe</p>
      </Collapse>,
    );

    expect(html).toContain('Detalhe');
    expect(html).toContain('inert=""');
  });

  it('open: full track, opaque, reachable', () => {
    const html = renderToStaticMarkup(
      <Collapse isOpen>
        <p>Detalhe</p>
      </Collapse>,
    );

    expect(html).toContain('grid-rows-[1fr]');
    expect(html).toContain('opacity-100');
    expect(html).not.toContain('inert');
    expect(html).not.toContain('aria-hidden');
    expect(html).toContain('Detalhe');
  });

  it('animates only the row track and the opacity, with the system duration and curve', () => {
    const html = renderToStaticMarkup(
      <Collapse isOpen>
        <p>Detalhe</p>
      </Collapse>,
    );

    expect(html).toContain('transition-[grid-template-rows]');
    expect(html).toContain('transition-opacity');
    expect(html).toContain('duration-(--duration-slide)');
    expect(html).toContain('ease-(--ease-standard)');
    expect(html).not.toContain('transition-all');
  });

  it('lets the caller cancel a parent gap with the track and give the space to the content', () => {
    const html = renderToStaticMarkup(
      <Collapse isOpen={false} trackClassName="-mt-s16" contentClassName="pt-s16">
        <p>Detalhe</p>
      </Collapse>,
    );

    expect(html).toContain('-mt-s16');
    expect(html).toContain('pt-s16');
  });

  it('clips at the edge of the content by default: nothing is left of room for a ring', () => {
    const html = renderToStaticMarkup(
      <Collapse isOpen>
        <p>Detalhe</p>
      </Collapse>,
    );

    expect(html).toContain('overflow-hidden');
    expect(html).not.toContain('py-s4');
    expect(html).not.toContain('-my-s4');
  });

  it('with bleedY gives the clipping box 4 px above and below and takes them back, so a field keeps its whole border', () => {
    const html = renderToStaticMarkup(
      <Collapse isOpen bleedY>
        <p>Detalhe</p>
      </Collapse>,
    );

    expect(html).toContain('overflow-hidden');
    expect(html).toContain('py-s4');
    expect(html).toContain('-my-s4');
  });
});
