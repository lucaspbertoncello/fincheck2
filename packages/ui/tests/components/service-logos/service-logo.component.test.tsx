import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ServiceLogo, SERVICE_LOGO_ART } from '#/components/service-logos/index.ts';

const SLUGS = Object.keys(SERVICE_LOGO_ART) as (keyof typeof SERVICE_LOGO_ART)[];

describe('ServiceLogo', () => {
  it('has the 18 logos of Simple Icons, each one path on the 24 box with an official color', () => {
    expect(SLUGS).toHaveLength(18);
    for (const slug of SLUGS) {
      expect(SERVICE_LOGO_ART[slug].path).toMatch(/^[Mm]/);
      expect(SERVICE_LOGO_ART[slug].hex).toMatch(/^[0-9A-F]{6}$/);
    }
  });

  it('takes the text color when the brand color is near black, so it holds in both themes', () => {
    const inked = SLUGS.filter((slug) => SERVICE_LOGO_ART[slug].ink);

    expect(inked.sort()).toEqual(['appletv', 'githubcopilot', 'hbomax', 'tidal', 'zdotai']);
  });

  it('draws the symbol in the official color over the subtle circle', () => {
    const html = renderToStaticMarkup(<ServiceLogo slug="netflix" name="Netflix" />);

    expect(html).toContain('bg-subtle');
    expect(html).toContain('size-9 shrink-0');
    expect(html).toContain('lg:size-10');
    expect(html).toContain('color:#E50914');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain(`d="${SERVICE_LOGO_ART.netflix.path}"`);
  });

  it('draws a near-black brand in the text color of the theme, with no inline color', () => {
    const html = renderToStaticMarkup(<ServiceLogo slug="tidal" name="Tidal" />);

    expect(html).toContain('text-fg-primary');
    expect(html).not.toContain('color:#');
  });

  it('gives every logo the same circle and the same share of it', () => {
    const shapes = SLUGS.map((slug) => {
      const html = renderToStaticMarkup(<ServiceLogo slug={slug} name={slug} />);

      return [
        html.match(/class="([^"]*)"/)?.[1]?.replace(/text-fg-primary/, ''),
        html.match(/width:\d+%/)?.[0],
      ];
    });

    for (const shape of shapes) {
      expect(shape[0]?.trim()).toBe(shapes[0]?.[0]?.trim());
      expect(shape[1]).toBe('width:56%');
    }
  });

  it('writes the initial in the same circle when the service has no logo file', () => {
    const html = renderToStaticMarkup(<ServiceLogo slug={null} name="Disney+" />);

    expect(html).toContain('size-9 shrink-0');
    expect(html).toContain('bg-subtle');
    expect(html).toContain('>D<');
    expect(html).not.toContain('<svg');
  });
});
