import {
  bulkPackageActionOutputSchema,
  getActualCostsOutputSchema,
  getAgentsOutputSchema,
  getPackagesByLineItemIdOutputSchema,
  getServicesOutputSchema,
  getTrackingOutputSchema,
} from '@/schemas/other/edelivery.js';
import { decodeEffectSchemaSync } from '@/utils/effectSchema.js';
import { describe, expect, it } from 'vitest';

describe('eDelivery wire output schemas', () => {
  it('accepts the serviceList envelope for getServices', () => {
    const response = {
      serviceList: {
        limit: 10,
        offset: 0,
        total: 1,
        services: [{ shippingServiceId: 'SVC-1', nameEn: 'SpeedPAK', maxWeight: 30 }],
      },
    };

    expect(decodeEffectSchemaSync(getServicesOutputSchema, response)).toEqual(response);
  });

  it('accepts the itemPackages envelope for getPackagesByLineItemId', () => {
    const response = {
      itemPackages: [{ packageId: 'PKG-1', packageStatus: 'CONFIRMED', trackingNumber: 'TRACK-1' }],
    };

    expect(decodeEffectSchemaSync(getPackagesByLineItemIdOutputSchema, response)).toEqual(response);
  });

  it('accepts the actualCosts envelope for getActualCosts', () => {
    const response = {
      actualCosts: [
        {
          actualWeight: 1.2,
          amount: { currency: 'USD', value: '10.50' },
          chargeMode: 'BY_WEIGHT',
          costType: 'SHIPPING',
          trackingNumber: 'TRACK-1',
        },
      ],
    };

    expect(decodeEffectSchemaSync(getActualCostsOutputSchema, response)).toEqual(response);
  });

  it('uses the spec envelopes that replaced the pre-port shapes', () => {
    const agents = {
      agentList: { total: 1, agents: [{ agentName: 'Agent', agentPhone: '123' }] },
    };
    const tracking = {
      trackingDetails: [{ status: 'IN_TRANSIT', trackingNumber: 'TRACK-1' }],
    };

    expect(decodeEffectSchemaSync(getAgentsOutputSchema, agents)).toEqual(agents);
    expect(decodeEffectSchemaSync(getTrackingOutputSchema, tracking)).toEqual(tracking);
  });

  it('passes through undocumented fields at every level instead of rejecting them', () => {
    const response = {
      undocumentedTopLevel: 'kept',
      serviceList: {
        undocumentedNested: true,
        services: [{ shippingServiceId: 'SVC-1', undocumentedItemField: 42 }],
      },
    };

    expect(decodeEffectSchemaSync(getServicesOutputSchema, response)).toEqual(response);
  });

  it('shares one bulk action envelope across cancel, confirm, and delete', () => {
    const response = {
      responses: [{ packageId: 'PKG-1', resultCode: 'SUCCESS', message: 'ok' }],
    };

    expect(decodeEffectSchemaSync(bulkPackageActionOutputSchema, response)).toEqual(response);
  });
});
