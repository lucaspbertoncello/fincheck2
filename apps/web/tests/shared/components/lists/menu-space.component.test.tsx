import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MenuSpace } from '#/shared/components/lists/menu-space.component.tsx';

describe('MenuSpace', () => {
  it('is an empty, hidden box the size of the "…" button (44 px on the phone, 40 from lg)', () => {
    const { container } = render(<MenuSpace />);
    const box = container.firstElementChild;

    expect(box).toHaveAttribute('aria-hidden', 'true');
    expect(box).toBeEmptyDOMElement();
    expect(box).toHaveClass('block', 'size-ctl-touch', 'lg:size-ctl-tab');
  });
});
