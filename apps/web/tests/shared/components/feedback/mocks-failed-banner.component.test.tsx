import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MocksFailedBanner } from '#/shared/components/feedback/mocks-failed-banner.component.tsx';

describe('MocksFailedBanner', () => {
  it('says the simulated data did not load and how to fix it', () => {
    render(<MocksFailedBanner />);

    expect(screen.getByRole('status')).toHaveTextContent('Os dados simulados não carregaram');
    expect(screen.getByRole('status')).toHaveTextContent('navegador comum');
  });
});
