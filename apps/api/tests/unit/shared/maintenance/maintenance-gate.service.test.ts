import { describe, expect, it } from 'vitest';

import { MaintenanceGate } from '#/shared/maintenance/maintenance-gate.service.ts';

describe('MaintenanceGate', () => {
  it('starts open, closes on begin and opens on end', () => {
    const gate = new MaintenanceGate();
    expect(gate.isActive()).toBe(false);

    gate.begin();
    expect(gate.isActive()).toBe(true);

    gate.end();
    expect(gate.isActive()).toBe(false);
  });
});
