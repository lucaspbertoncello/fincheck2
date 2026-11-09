import { describe, expect, it } from 'vitest';

import {
  SEGMENTED_ITEM_CLASS,
  SEGMENTED_ITEM_FIT_CLASS,
} from '#/components/forms/segmented-classes.constant.ts';
import { MODAL_SIZE_CLASS } from '#/components/overlays/modal-size.constant.ts';

describe('Modal box', () => {
  it.each(Object.entries(MODAL_SIZE_CLASS).filter(([size]) => size !== 'confirm'))(
    'fixes the height and caps the width of "%s"',
    (_size, classes) => {
      expect(classes).toMatch(/(^|\s)h-\[\d+rem\](\s|$)/);
      expect(classes).toMatch(/lg:max-w-/);
    },
  );

  it('lets the confirmation follow its content, with the width of the dialog', () => {
    expect(MODAL_SIZE_CLASS.confirm).not.toMatch(/(^|\s)h-/);
    expect(MODAL_SIZE_CLASS.confirm).toContain('lg:max-w-130');
  });

  it('never wraps a segment label', () => {
    expect(SEGMENTED_ITEM_CLASS).toContain('whitespace-nowrap');
    expect(SEGMENTED_ITEM_FIT_CLASS).toContain('whitespace-nowrap');
    expect(SEGMENTED_ITEM_FIT_CLASS).toContain('min-w-0');
  });
});
