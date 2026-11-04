import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSideResize } from '#/shared/layouts/application/transition/use-side-resize.hook.ts';

function Pair({ flipKey }: { flipKey: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useSideResize(ref, flipKey);
  return <div ref={ref} data-testid="pair" />;
}

let height = 700;
const animate = vi.fn();
const originalMatchMedia: unknown = Reflect.get(window, 'matchMedia');

beforeEach(() => {
  height = 700;
  animate.mockReset();
  animate.mockReturnValue({ onfinish: null, oncancel: null, cancel: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => height,
  });
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  Reflect.set(window, 'matchMedia', originalMatchMedia);
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
});

describe('useSideResize', () => {
  it('does nothing on the first render and while the key does not flip', () => {
    const view = render(<Pair flipKey />);
    view.rerender(<Pair flipKey />);

    expect(animate).not.toHaveBeenCalled();
    expect(view.getByTestId('pair')).not.toHaveAttribute('data-resizing');
  });

  it('animates the height from the old one to the new one, with the system duration and curve', () => {
    const view = render(<Pair flipKey />);
    height = 450; // the natural height of the new content (the Configurações menu)

    view.rerender(<Pair flipKey={false} />);

    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledWith(
      { height: ['700px', '450px'] },
      { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    expect(view.getByTestId('pair')).toHaveAttribute('data-resizing');
  });

  it('clears the pinned height and the marker when the animation ends', () => {
    const view = render(<Pair flipKey />);
    height = 450;
    view.rerender(<Pair flipKey={false} />);
    const animation = animate.mock.results[0]!.value as { onfinish: () => void };

    animation.onfinish();

    const pair = view.getByTestId('pair');
    expect(pair).not.toHaveAttribute('data-resizing');
    expect(pair.style.height).toBe('');
  });

  it('starts the way back from the height the first animation ended on, not from the new content', () => {
    const view = render(<Pair flipKey />);
    height = 450;
    view.rerender(<Pair flipKey={false} />);
    (animate.mock.results[0]!.value as { onfinish: () => void }).onfinish();
    animate.mockClear();
    animate.mockReturnValue({ onfinish: null, oncancel: null, cancel: vi.fn() });

    // the panel comes back: at the flip commit the DOM already holds its (taller) content
    height = 700;
    view.rerender(<Pair flipKey />);

    expect(animate).toHaveBeenCalledWith(
      { height: ['450px', '700px'] },
      { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
  });

  it('skips the animation when the height does not change', () => {
    const view = render(<Pair flipKey />);

    view.rerender(<Pair flipKey={false} />);

    expect(animate).not.toHaveBeenCalled();
    expect(view.getByTestId('pair')).not.toHaveAttribute('data-resizing');
  });

  it('does not resize with reduced motion: the swap is instant', () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
    })) as unknown as typeof window.matchMedia;
    const view = render(<Pair flipKey />);
    height = 450;

    view.rerender(<Pair flipKey={false} />);

    expect(animate).not.toHaveBeenCalled();
    expect(view.getByTestId('pair')).not.toHaveAttribute('data-resizing');
  });
});
