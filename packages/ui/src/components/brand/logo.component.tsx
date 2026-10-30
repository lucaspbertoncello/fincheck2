import type { Ref } from 'react';

import { LOGO_WORDMARK_PATH } from '#/components/brand/logo-wordmark.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type LogoProps = {
  className?: string;
  ref?: Ref<SVGSVGElement>;
};

/**
 * Horizontal logo: the two cards, the word "fincheck" in Fustat 600 and the mini card dot of the i.
 * Ink and back card follow the theme tokens; it is never pure black.
 */
export function Logo({ className, ref }: LogoProps) {
  return (
    <svg
      ref={ref}
      viewBox="-8 -92 571.1 104"
      role="img"
      aria-label="fincheck"
      className={cx('block h-5.5 w-auto lg:h-6.5', className)}
    >
      <defs>
        <mask id="logo-mask-back" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
          <rect width="48" height="48" fill="#fff" />
          <rect x="1.5" y="14.5" width="39" height="28" rx="7.5" fill="#000" />
        </mask>
        <mask id="logo-mask-front" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
          <rect width="48" height="48" fill="#fff" />
          <path
            d="M13.5 29 L18.5 34 L28.5 23.5"
            fill="none"
            stroke="#000"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
        <linearGradient id="logo-grad-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F9B79" />
          <stop offset="1" stopColor="#006F53" />
        </linearGradient>
        <linearGradient id="logo-grad-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset=".4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="logo-grad-dot"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="-77.1"
          x2="0"
          y2="-65.6"
        >
          <stop offset="0" stopColor="#2F9B79" />
          <stop offset="1" stopColor="#006F53" />
        </linearGradient>
      </defs>
      <g transform="translate(-9.6 -92.4) scale(2.4)">
        <rect
          x="13"
          y="7"
          width="31"
          height="21"
          rx="4.5"
          mask="url(#logo-mask-back)"
          className="fill-(--color-logo-back)"
        />
        <g mask="url(#logo-mask-front)">
          <rect x="4" y="17" width="34" height="23" rx="5" fill="url(#logo-grad-card)" />
          <rect
            x="4.5"
            y="17.5"
            width="33"
            height="22"
            rx="4.5"
            fill="none"
            stroke="url(#logo-grad-shine)"
            strokeWidth="1"
          />
        </g>
      </g>
      <g transform="translate(121 0)">
        <path d={LOGO_WORDMARK_PATH} className="fill-(--color-logo-ink)" />
        <rect
          x="43.2"
          y="-77.1"
          width="17"
          height="11.5"
          rx="4"
          fill="url(#logo-grad-dot)"
          transform="rotate(-8 51.7 -71.4)"
        />
      </g>
    </svg>
  );
}
