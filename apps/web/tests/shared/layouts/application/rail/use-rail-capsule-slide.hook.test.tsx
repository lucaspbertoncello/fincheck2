import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRailCapsuleSlide } from '#/shared/layouts/application/rail/use-rail-capsule-slide.hook.ts';

/** The top of the active cell (the parent of the capsule) at the moment of each render. */
let cellTop = 0;
const animate = vi.fn();
const originalMatchMedia: unknown = Reflect.get(window, 'matchMedia');

function Pair({ flipKey }: { flipKey: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useRailCapsuleSlide(ref, flipKey);
  return (
    <div ref={ref}>
      <a data-cell>
        <span className="tab-indicator" />
      </a>
    </div>
  );
}

beforeEach(() => {
  cellTop = 163;
  animate.mockReset();
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value(this: HTMLElement) {
      const top = 'cell' in this.dataset ? cellTop : 0;
      return { top, left: 0, right: 0, bottom: 0, width: 40, height: 40, x: 0, y: top };
    },
  });
});

afterEach(() => {
  Reflect.set(window, 'matchMedia', originalMatchMedia);
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  Reflect.deleteProperty(HTMLElement.prototype, 'getBoundingClientRect');
});

describe('useRailCapsuleSlide', () => {
  it('does nothing on the first render and while the key does not flip', () => {
    const view = render(<Pair flipKey />);
    view.rerender(<Pair flipKey />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('starts the new capsule where the old one was and eases it home with the resize curve', () => {
    const view = render(<Pair flipKey />);
    cellTop = 391; // Configurações, at the foot of the rail, once the column changes kind

    view.rerender(<Pair flipKey={false} />);

    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledWith(
      [{ transform: 'translateY(-228px)' }, { transform: 'translateY(0)' }],
      { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)', delay: 34, fill: 'backwards' },
    );
  });

  it('jumps with reduced motion', () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
    })) as unknown as typeof window.matchMedia;
    const view = render(<Pair flipKey />);
    cellTop = 391;

    view.rerender(<Pair flipKey={false} />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('does nothing when the capsule did not move', () => {
    const view = render(<Pair flipKey />);

    view.rerender(<Pair flipKey={false} />);

    expect(animate).not.toHaveBeenCalled();
  });
});
