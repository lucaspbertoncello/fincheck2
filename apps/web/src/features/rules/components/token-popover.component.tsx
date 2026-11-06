import type { ReactNode } from 'react';
import { Dialog, DialogTrigger, Popover } from 'react-aria-components';

type TokenPopoverProps = {
  /** The token that opens the popover (a `RuleToken` with a press handler). */
  trigger: ReactNode;
  /** Accessible name of the popover. */
  label: string;
  /** The content; it gets the function that closes the popover. */
  children: (close: () => void) => ReactNode;
};

/** Small panel under a blank of the rule sentence, where its value is picked or typed. */
export function TokenPopover({ trigger, label, children }: TokenPopoverProps) {
  return (
    <DialogTrigger>
      {trigger}
      <Popover
        placement="bottom start"
        offset={8}
        className="popover-enter w-80 rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover)"
      >
        <Dialog aria-label={label} className="flex flex-col gap-s12 p-s16 outline-none">
          {({ close }) => children(close)}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
