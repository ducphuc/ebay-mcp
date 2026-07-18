import type { EbayApiClient } from '@/api/client.js';
import { LogisticsApi } from '@/api/logistics/logistics.js';
import { EndpointInputError } from '@/api/shared/request.js';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('LogisticsApi', () => {
  let client: EbayApiClient;
  let api: LogisticsApi;

  beforeEach(() => {
    client = {
      get: vi.fn(),
      getConfig: vi.fn(() => ({ marketplaceId: 'EBAY_US' })),
      post: vi.fn(),
    } as unknown as EbayApiClient;
    api = new LogisticsApi(client);
  });

  const shippingQuoteRequest = {
    orders: [{ orderId: 'ORDER-1' }],
    packageSpecification: {
      dimensions: { height: '1', length: '2', width: '3', unit: 'INCH' as const },
      weight: { value: '4', unit: 'OUNCE' as const },
    },
    shipFrom: {
      fullName: 'Seller',
      contactAddress: {
        addressLine1: '1 Main St',
        city: 'Phoenix',
        stateOrProvince: 'AZ',
        postalCode: '85001',
        countryCode: 'US' as const,
      },
    },
    shipTo: {
      fullName: 'Buyer',
      contactAddress: {
        addressLine1: '2 Main St',
        city: 'Tempe',
        stateOrProvince: 'AZ',
        postalCode: '85281',
        countryCode: 'US' as const,
      },
    },
  };

  it('creates a shipping quote with a marketplace header override', async () => {
    vi.mocked(client.post).mockResolvedValue({ shippingQuoteId: 'QUOTE-1' });

    const result = await Effect.runPromise(
      api.createShippingQuote({
        shippingQuoteRequest,
        marketplaceId: 'EBAY_US',
      }),
    );

    expect(client.post).toHaveBeenCalledWith(
      '/sell/logistics/v1_beta/shipping_quote',
      shippingQuoteRequest,
      {
        headers: { 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' },
        retryServerErrors: false,
      },
    );
    expect(result).toEqual({ shippingQuoteId: 'QUOTE-1' });
  });

  it('falls back to the configured marketplace header when omitted', async () => {
    vi.mocked(client.post).mockResolvedValue({ shippingQuoteId: 'QUOTE-1' });

    await Effect.runPromise(api.createShippingQuote({ shippingQuoteRequest }));

    expect(client.post).toHaveBeenCalledWith(
      '/sell/logistics/v1_beta/shipping_quote',
      shippingQuoteRequest,
      {
        headers: { 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' },
        retryServerErrors: false,
      },
    );
  });

  it('fails locally when no marketplace ID is available', async () => {
    vi.mocked(client.getConfig).mockReturnValue({} as ReturnType<EbayApiClient['getConfig']>);

    const result = await Effect.runPromise(
      Effect.either(api.createShippingQuote({ shippingQuoteRequest })),
    );

    expect(result._tag).toBe('Left');
    expect(client.post).not.toHaveBeenCalled();
  });

  it('fails with a tagged input error when the quote request body is missing', async () => {
    const result = await Effect.runPromise(
      Effect.either(api.createShippingQuote({} as Parameters<typeof api.createShippingQuote>[0])),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(EndpointInputError);
    }
    expect(client.post).not.toHaveBeenCalled();
  });

  it('gets a shipping quote by ID', async () => {
    vi.mocked(client.get).mockResolvedValue({ shippingQuoteId: 'QUOTE-1' });

    const result = await Effect.runPromise(api.getShippingQuote({ shippingQuoteId: 'QUOTE/1' }));

    expect(client.get).toHaveBeenCalledWith('/sell/logistics/v1_beta/shipping_quote/QUOTE%2F1');
    expect(result).toEqual({ shippingQuoteId: 'QUOTE-1' });
  });

  it('creates a shipment from a shipping quote', async () => {
    vi.mocked(client.post).mockResolvedValue({ shipmentId: 'SHIP-1' });

    const result = await Effect.runPromise(
      api.createFromShippingQuote({
        createShipmentFromQuoteRequest: { shippingQuoteId: 'QUOTE-1', rateId: 'RATE-1' },
        marketplaceId: 'EBAY_US',
      }),
    );

    expect(client.post).toHaveBeenCalledWith(
      '/sell/logistics/v1_beta/shipment/create_from_shipping_quote',
      { shippingQuoteId: 'QUOTE-1', rateId: 'RATE-1' },
      {
        headers: { 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' },
        retryServerErrors: false,
      },
    );
    expect(result).toEqual({ shipmentId: 'SHIP-1' });
  });

  it('cancels a shipment by ID', async () => {
    vi.mocked(client.post).mockResolvedValue({ shipmentId: 'SHIP-1' });

    await Effect.runPromise(api.cancelShipment({ shipmentId: 'SHIP/1' }));

    expect(client.post).toHaveBeenCalledWith(
      '/sell/logistics/v1_beta/shipment/SHIP%2F1/cancel',
      {},
      { retryServerErrors: false },
    );
  });

  it('downloads a label file as a base64 payload', async () => {
    const labelBytes = Buffer.from('%PDF-1.4 label');
    vi.mocked(client.get).mockResolvedValue(labelBytes);

    const result = await Effect.runPromise(api.downloadLabelFile({ shipmentId: 'SHIP-1' }));

    expect(client.get).toHaveBeenCalledWith(
      '/sell/logistics/v1_beta/shipment/SHIP-1/download_label_file',
      undefined,
      {
        headers: { Accept: 'application/pdf' },
        responseType: 'arraybuffer',
      },
    );
    expect(result).toEqual({
      shipmentId: 'SHIP-1',
      contentType: 'application/pdf',
      encoding: 'base64',
      data: labelBytes.toString('base64'),
      sizeBytes: labelBytes.byteLength,
    });
  });

  it('rejects the removed PNG label variant before calling eBay', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        api.downloadLabelFile({
          shipmentId: 'SHIP-1',
          accept: 'image/png',
        } as Parameters<typeof api.downloadLabelFile>[0]),
      ),
    );

    expect(result._tag).toBe('Left');
    expect(client.get).not.toHaveBeenCalled();
  });
});
