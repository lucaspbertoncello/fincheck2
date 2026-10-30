const EASE = 'cubic-bezier(.2,.8,.2,1)';
const FLIGHT_EASE = 'cubic-bezier(.3,.7,.1,1)';
const HOLE_EASE = 'cubic-bezier(.3,.5,.3,1)';
/** The intro of the splash (index.html) takes 520 ms; the exit starts at 600 ms at the earliest. */
const EXIT_AT = 600;
const FALLBACK_INK = '#0b2d22';

let started = false;

function finish(splash: HTMLElement | null): void {
  splash?.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
  splash?.remove();
  document.documentElement.removeAttribute('data-splash');
}

/**
 * Splash exit (motion.md 2): the logo flies from the center to its place in the top bar while a
 * round hole opens in the green and shows the app. The markup and the intro live in index.html,
 * so there is no white screen on F5. Click or any key skips it. With reduced motion there is no
 * green and no flight: the app fades in over 200 ms. Runs once; without the splash it does nothing.
 */
export function runSplash(): void {
  if (started) return;
  const splash = document.getElementById('splash');
  const bg = document.getElementById('splash-bg');
  const fly = document.getElementById('splash-logo');
  const slot = document.querySelector('[data-logo-slot]');
  const root = document.getElementById('root');
  started = true;

  if (!splash || !bg || !fly || !slot || !root) {
    finish(splash);
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish(splash);
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    return;
  }

  // The flying logo sits at its final rectangle and starts as a translate + scale that puts it at the center.
  const rect = slot.getBoundingClientRect();
  const scale = Math.min(320, window.innerWidth * 0.7) / rect.width;
  const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
  const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
  Object.assign(fly.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transform: 'none',
  });

  const delay = Math.max(0, EXIT_AT - performance.now());
  const ink =
    getComputedStyle(document.documentElement).getPropertyValue('--color-logo-ink').trim() ||
    FALLBACK_INK;
  const options = { delay, fill: 'both' } as const;

  const flight = fly.animate(
    [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: 'none' }],
    { ...options, duration: 520, easing: FLIGHT_EASE },
  );
  fly
    .querySelectorAll('.sl-name')
    .forEach((name) =>
      name.animate([{ fill: '#fff' }, { fill: ink }], { ...options, duration: 420, easing: EASE }),
    );
  fly
    .querySelectorAll('.sl-white')
    .forEach((white) =>
      white.animate([{ opacity: 1 }, { opacity: 0 }], { ...options, duration: 420, easing: EASE }),
    );
  bg.animate(
    [{ '--r': '0px' }, { '--r': `${Math.hypot(window.innerWidth, window.innerHeight)}px` }],
    { ...options, duration: 520, easing: HOLE_EASE },
  );
  root.animate(
    [
      { transform: 'scale(.985)', opacity: 0.6 },
      { transform: 'none', opacity: 1 },
    ],
    { delay: delay + 40, duration: 480, easing: EASE, fill: 'backwards' },
  );

  const skip = () => finish(splash);
  window.addEventListener('pointerdown', skip, { once: true });
  window.addEventListener('keydown', skip, { once: true });
  void flight.finished.then(
    () => {
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
      finish(splash);
    },
    () => undefined,
  );
}
