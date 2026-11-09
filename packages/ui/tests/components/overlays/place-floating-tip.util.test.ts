import { describe, expect, it } from 'vitest';

import { placeFloatingTip } from '#/components/overlays/place-floating-tip.util.ts';

const VIEWPORT = { width: 1280, height: 720 };
const TIP = { width: 160, height: 32 };
const BASE = { tip: TIP, viewport: VIEWPORT, gap: 8, margin: 8 };

function anchorAt(left: number, top: number) {
  return { left, right: left + 12, top, bottom: top + 12 };
}

describe('placeFloatingTip', () => {
  it('opens over the anchor, centered on it, when there is room above', () => {
    const placement = placeFloatingTip({ ...BASE, anchor: anchorAt(600, 300) });

    expect(placement.side).toBe('top');
    expect(placement.top).toBe(300 - 8 - 32);
    expect(placement.left).toBe(606 - 80);
  });

  it('opens under the anchor when the window has no room above it', () => {
    // The first row of a map at the top of the window: 20 px above, a 32 px tip does not fit.
    const placement = placeFloatingTip({ ...BASE, anchor: anchorAt(600, 20) });

    expect(placement.side).toBe('bottom');
    expect(placement.top).toBe(20 + 12 + 8);
  });

  it('takes the side with more room when neither fits', () => {
    const tall = { ...BASE, tip: { width: 160, height: 500 } };

    expect(placeFloatingTip({ ...tall, anchor: anchorAt(600, 200) }).side).toBe('bottom');
    expect(placeFloatingTip({ ...tall, anchor: anchorAt(600, 450) }).side).toBe('top');
  });

  it('never leaves the window sideways', () => {
    expect(placeFloatingTip({ ...BASE, anchor: anchorAt(0, 300) }).left).toBe(8);
    expect(placeFloatingTip({ ...BASE, anchor: anchorAt(1268, 300) }).left).toBe(1280 - 8 - 160);
  });
});
