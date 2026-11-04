import type { ReactElement } from 'react';
import { OverlayArrow, Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';

import {
  TOOLTIP_CLOSE_DELAY_MS,
  TOOLTIP_OPEN_DELAY_MS,
} from '#/components/overlays/tooltip-timing.constant.ts';

type TooltipProps = {
  /** The text of the tip. For an icon-only control it is the same text as the control's accessible name. */
  label: string;
  /** The side of the trigger the tip opens on; the rail uses the default, to the right. */
  placement?: 'right' | 'left' | 'top' | 'bottom';
  /** The one focusable, hoverable element that carries the tip (a React Aria `Button` or `Link`). */
  children: ReactElement;
};

/**
 * Name tip of an icon-only control (components.md 1.2): the dark tip of the chart (`fg-primary`
 * surface, `page` text, the input radius, the tooltip shadow) with a small arrow, 12 px off the
 * trigger. It shows on hover after a short wait and at once on keyboard focus; once one tip has
 * shown, the next ones in the same sweep open without the wait (React Aria's warm-up). The move is
 * 4 px along the side it opens on plus the fade; reduced motion keeps only the fade.
 *
 * Screen readers: React Aria links the tip to the trigger with `aria-describedby`. Because the
 * text equals the trigger's accessible name, the browser drops the description and nothing is read
 * twice; keep the two texts equal.
 */
export function Tooltip({ label, placement = 'right', children }: TooltipProps) {
  return (
    <TooltipTrigger delay={TOOLTIP_OPEN_DELAY_MS} closeDelay={TOOLTIP_CLOSE_DELAY_MS}>
      {children}
      <AriaTooltip
        placement={placement}
        offset={12}
        className="group/tip rounded-input bg-fg-primary px-s12 py-s8 text-label leading-none font-emphasis whitespace-nowrap text-page shadow-(--shadow-tooltip) transition-[opacity,transform] duration-(--duration-fast) ease-(--ease-standard) data-[entering]:opacity-0 data-[exiting]:opacity-0 data-[entering]:data-[placement=right]:-translate-x-1 data-[exiting]:data-[placement=right]:-translate-x-1 data-[entering]:data-[placement=left]:translate-x-1 data-[exiting]:data-[placement=left]:translate-x-1 data-[entering]:data-[placement=top]:translate-y-1 data-[exiting]:data-[placement=top]:translate-y-1 data-[entering]:data-[placement=bottom]:-translate-y-1 data-[exiting]:data-[placement=bottom]:-translate-y-1 motion-reduce:translate-x-0! motion-reduce:translate-y-0!"
      >
        <OverlayArrow>
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            aria-hidden="true"
            className="block fill-fg-primary group-data-[placement=right]/tip:rotate-90 group-data-[placement=left]/tip:-rotate-90 group-data-[placement=bottom]/tip:rotate-180"
          >
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
        {label}
      </AriaTooltip>
    </TooltipTrigger>
  );
}
