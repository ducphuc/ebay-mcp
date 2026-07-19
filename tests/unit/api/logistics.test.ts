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
      post: vi.fn(),
    } as unknown as EbayApiClient;
    api = new LogisticsApi(client);
  });

  it('creates a shipping quote with a marketplace header override', async () => {
    vi.mocked(client.post).mockResolvedValue({ shippingQuoteId: 'QUOTE-1' });

    const result = await Effect.runPromise(
      api.createShippingQuote({
        shippingQuoteRequest: { orders: [{ orderId: 'ORDER-1' }] },
        marketplaceId: 'EBAY_US',
      }),
    );

    expect(client.post).toHaveBeenCalledWith(
      '/sell/logistics/v1_beta/shipping_quote',
      { orders: [{ orderId: 'ORDER-1' }] },
      { headers: { 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' } },
    );
    expect(result).toEqual({ shippingQuoteId: 'QUOTE-1' });
  });

  it('creates a shipping quote without a marketplace header when omitted', async () => {
    vi.mocked(client.post).mockResolvedValue({ shippingQuoteId: 'QUOTE-1' });

    await Effect.runPromise(
      api.createShippingQuote({ shippingQuoteRequest: { orders: [{ orderId: 'ORDER-1' }] } }),
    );

    expect(client.post).toHaveBeenCalledWith('/sell/logistics/v1_beta/shipping_quote', {
      orders: [{ orderId: 'ORDER-1' }],
    });
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

    const result = await Effect.runPromise(api.getShippingQuote({ shippingQuoteId: 'QUOTE-1' }));

    expect(client.get).toHaveBeenCalledWith('/sell/logistics/v1_beta/shipping_quote/QUOTE-1');
    expect(result).toEqual({ shippingQuoteId: 'QUOTE-1' });
  });

  it('creates a shipment from a shipping quote', async () => {
    vi.mocked(client.post).mockResolvedValue({ shipmentId: 'SHIP-1' });

    const result = await Effect.runPromise(
      api.createFromShippingQuote({
        createShipmentFromQuoteRequest: { shippingQuoteId: 'QUOTE-1', rateId: 'RATE-1' },
      }),
    );

    expect(client.post).toHaveBeenCalledWith(
      '/sell/logistics/v1_beta/shipment/create_from_shipping_quote',
      { shippingQuoteId: 'QUOTE-1', rateId: 'RATE-1' },
    );
    expect(result).toEqual({ shipmentId: 'SHIP-1' });
  });

  it('cancels a shipment by ID', async () => {
    vi.mocked(client.post).mockResolvedValue({ shipmentId: 'SHIP-1' });

    await Effect.runPromise(api.cancelShipment({ shipmentId: 'SHIP-1' }));

    expect(client.post).toHaveBeenCalledWith('/sell/logistics/v1_beta/shipment/SHIP-1/cancel', {});
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

  it('requests the PNG label variant when accept is provided', async () => {
    vi.mocked(client.get).mockResolvedValue(Buffer.from('png-bytes'));

    const result = await Effect.runPromise(
      api.downloadLabelFile({ shipmentId: 'SHIP-1', accept: 'image/png' }),
    );

    expect(client.get).toHaveBeenCalledWith(
      '/sell/logistics/v1_beta/shipment/SHIP-1/download_label_file',
      undefined,
      {
        headers: { Accept: 'image/png' },
        responseType: 'arraybuffer',
      },
    );
    expect(result.contentType).toBe('image/png');
  });
});
