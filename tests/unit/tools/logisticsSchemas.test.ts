import {
  createFromShippingQuoteInputSchema,
  createShippingQuoteInputSchema,
  downloadLabelFileInputSchema,
  getShippingQuoteInputSchema,
  shipmentIdInputSchema,
} from '@/schemas/logistics/logistics.js';
import { decodeEffectSchemaSync } from '@/utils/effectSchema.js';
import { describe, expect, it } from 'vitest';

const validQuote = () => ({
  orders: [{ orderId: 'ORDER-1', channel: 'EBAY' }],
  packageSpecification: {
    dimensions: { height: '1', length: '2.5', width: '3', unit: 'INCH' },
    weight: { value: '4', unit: 'OUNCE' },
  },
  shipFrom: {
    fullName: 'Seller',
    contactAddress: {
      addressLine1: '1 Main St',
      city: 'Phoenix',
      stateOrProvince: 'AZ',
      postalCode: '85001',
      countryCode: 'US',
    },
  },
  shipTo: {
    fullName: 'Buyer',
    contactAddress: {
      addressLine1: '2 Main St',
      city: 'Tempe',
      stateOrProvince: 'AZ',
      postalCode: '85281',
      countryCode: 'US',
    },
  },
});

describe('Logistics tool schemas', () => {
  it('requires all four quote fields', () => {
    for (const field of ['orders', 'packageSpecification', 'shipFrom', 'shipTo'] as const) {
      const request = validQuote();
      delete request[field] as never;
      expect(() =>
        decodeEffectSchemaSync(createShippingQuoteInputSchema, {
          shippingQuoteRequest: request,
        }),
      ).toThrow();
    }
  });

  it('requires 1-10 non-empty eBay orders', () => {
    for (const orders of [
      [],
      Array.from({ length: 11 }, (_, index) => ({ orderId: `ORDER-${index}` })),
      [{ orderId: '' }],
      [{ orderId: 'ORDER-1', channel: 'OTHER' }],
    ]) {
      expect(() =>
        decodeEffectSchemaSync(createShippingQuoteInputSchema, {
          shippingQuoteRequest: { ...validQuote(), orders },
        }),
      ).toThrow();
    }
  });

  it('requires complete positive package measurements using official units', () => {
    const valid = validQuote();
    for (const packageSpecification of [
      {
        ...valid.packageSpecification,
        dimensions: { ...valid.packageSpecification.dimensions, height: '0' },
      },
      {
        ...valid.packageSpecification,
        dimensions: { ...valid.packageSpecification.dimensions, width: '-1' },
      },
      { ...valid.packageSpecification, dimensions: { height: '1', length: '2', unit: 'INCH' } },
      {
        ...valid.packageSpecification,
        dimensions: { ...valid.packageSpecification.dimensions, unit: 'MM' },
      },
      { ...valid.packageSpecification, weight: { value: '0', unit: 'OUNCE' } },
      { ...valid.packageSpecification, weight: { value: '1', unit: 'STONE' } },
    ]) {
      expect(() =>
        decodeEffectSchemaSync(createShippingQuoteInputSchema, {
          shippingQuoteRequest: { ...validQuote(), packageSpecification },
        }),
      ).toThrow();
    }
  });

  it('requires domestic-US address essentials for both contacts', () => {
    const valid = validQuote();
    for (const shipTo of [
      { ...valid.shipTo, fullName: '' },
      { ...valid.shipTo, contactAddress: { ...valid.shipTo.contactAddress, postalCode: '' } },
      { ...valid.shipTo, contactAddress: { ...valid.shipTo.contactAddress, countryCode: 'CA' } },
    ]) {
      expect(() =>
        decodeEffectSchemaSync(createShippingQuoteInputSchema, {
          shippingQuoteRequest: { ...validQuote(), shipTo },
        }),
      ).toThrow();
    }
  });

  it('accepts a complete quote and restricts shipment purchase fields', () => {
    expect(
      decodeEffectSchemaSync(createShippingQuoteInputSchema, {
        shippingQuoteRequest: validQuote(),
      }),
    ).toBeDefined();
    expect(
      decodeEffectSchemaSync(createFromShippingQuoteInputSchema, {
        createShipmentFromQuoteRequest: {
          shippingQuoteId: 'QUOTE-1',
          rateId: 'RATE-1',
          labelSize: '4"x6"',
        },
      }),
    ).toBeDefined();

    for (const request of [
      { shippingQuoteId: '', rateId: 'RATE-1' },
      { shippingQuoteId: 'QUOTE-1', rateId: '' },
      { shippingQuoteId: 'QUOTE-1', rateId: 'RATE-1', labelSize: '8.5"x11"' },
    ]) {
      expect(() =>
        decodeEffectSchemaSync(createFromShippingQuoteInputSchema, {
          createShipmentFromQuoteRequest: request,
        }),
      ).toThrow();
    }
  });

  it('requires non-empty path IDs and PDF-only label downloads', () => {
    expect(() =>
      decodeEffectSchemaSync(getShippingQuoteInputSchema, { shippingQuoteId: '' }),
    ).toThrow();
    expect(() =>
      decodeEffectSchemaSync(getShippingQuoteInputSchema, { shippingQuoteId: '   ' }),
    ).toThrow();
    expect(() => decodeEffectSchemaSync(shipmentIdInputSchema, { shipmentId: '' })).toThrow();
    expect(
      decodeEffectSchemaSync(downloadLabelFileInputSchema, {
        shipmentId: 'SHIP-1',
        accept: 'application/pdf',
      }),
    ).toBeDefined();
    expect(() =>
      decodeEffectSchemaSync(downloadLabelFileInputSchema, {
        shipmentId: 'SHIP-1',
        accept: 'image/png',
      }),
    ).toThrow();
  });
});
