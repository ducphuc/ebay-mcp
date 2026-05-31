import { describe, expect, it } from 'vitest';
import { getAllJsonSchemas } from '../../../src/schemas/index.js';

describe('schema index exports', () => {
  it('keeps Logistics, eDelivery, and Other APIs schema groups accessible', () => {
    const schemas = getAllJsonSchemas();

    expect(schemas.logistics).toBeDefined();
    expect(schemas.edelivery).toBeDefined();
    expect(schemas.otherApis).toBeDefined();

    expect(schemas.logistics.createShippingQuoteOutput).toBeDefined();
    expect(schemas.logistics.getShippingQuoteOutput).toBeDefined();
    expect(schemas.logistics.createFromShippingQuoteOutput).toBeDefined();
    expect(schemas.logistics.getShipmentOutput).toBeDefined();
    expect(schemas.logistics.cancelShipmentOutput).toBeDefined();

    expect(schemas.edelivery.createPackageInput).toBeDefined();
    expect(schemas.edelivery.createPackageOutput).toBeDefined();
    expect(schemas.edelivery.getPackageOutput).toBeDefined();
    expect(schemas.edelivery.bulkCancelPackagesInput).toBeDefined();
    expect(schemas.edelivery.bulkConfirmPackagesInput).toBeDefined();
    expect(schemas.edelivery.createBundleInput).toBeDefined();
    expect(schemas.edelivery.getBundleOutput).toBeDefined();
    expect(schemas.edelivery.getServicesOutput).toBeDefined();

    expect(schemas.otherApis.translateInput).toBeDefined();
  });
});
