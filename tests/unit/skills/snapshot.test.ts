import { describe, expect, it } from 'vitest';
import { buildRegistrySnapshot } from '@/skills/index.js';
import { getToolDefinitions } from '@/tools/index.js';

describe('skills registry snapshot', () => {
  it('matches the live advertised tool count', () => {
    const snapshot = buildRegistrySnapshot();
    expect(snapshot.toolCount).toBe(getToolDefinitions().length);
  });

  it('lists every family with positive counts that sum to the total', () => {
    const snapshot = buildRegistrySnapshot();

    expect(snapshot.families).toHaveLength(16);
    for (const family of snapshot.families) {
      expect(family.count).toBeGreaterThan(0);
      expect(family.title.length).toBeGreaterThan(0);
      expect(family.blurb.length).toBeGreaterThan(0);
    }

    const sum = snapshot.families.reduce((total, family) => total + family.count, 0);
    expect(sum).toBe(snapshot.toolCount);
  });

  it('describes the Media and Logistics families explicitly', () => {
    const families = new Map(
      buildRegistrySnapshot().families.map((family) => [family.key, family]),
    );

    expect(families.get('media')?.blurb).toContain('Picture Services');
    expect(families.get('logistics')?.blurb).toContain('Limited Release');
    expect(families.get('other')?.blurb).toContain('eDelivery');
    expect(families.get('finances')?.blurb).toContain('payouts');
  });
});
