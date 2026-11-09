import { useEffect, useRef, useState } from 'react';
import { Button } from 'react-aria-components';

import { Chip } from '#/components/chips/index.ts';
import { Tooltip } from '#/components/overlays/tooltip.component.tsx';

/**
 * The "Não lançada" chip of a card purchase the bank authorized and has not posted yet (the bank's
 * `PENDING` status). It is a real button so the explanation can be reached by keyboard: hover (after
 * the wait) and Tab focus show it, Esc hides it. A touch has no hover, and a screen reader's click is "virtual", so a tap or that click opens it and a tap
 * anywhere else, or on the chip again, closes it.
 */
export function NotPostedChip() {
  const [isOpen, setIsOpen] = useState(false);
  const wasOpenAtPress = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [isOpen]);

  return (
    <Tooltip
      label="O banco ainda não lançou esta compra. Ela já conta na fatura; o selo some quando o banco lançar."
      placement="top"
      multiline
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <Button
        onPressStart={() => {
          wasOpenAtPress.current = isOpen;
        }}
        onPress={(event) => {
          // A touch has no hover and a screen reader's click is "virtual": both toggle the explanation.
          if (event.pointerType === 'touch' || event.pointerType === 'virtual') {
            setIsOpen(!wasOpenAtPress.current);
          }
        }}
        className="focus-ring relative z-(--z-raised) inline-flex cursor-help rounded-capsule"
      >
        <Chip tone="warn" icon="clock">
          Não lançada
        </Chip>
      </Button>
    </Tooltip>
  );
}
