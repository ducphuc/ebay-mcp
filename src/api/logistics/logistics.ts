import type { EbayApiClient, EbayRequestConfig } from '@/api/client.js';
import {
  type EbayApiError,
  EndpointInputError,
  optionalStringEffect,
  requestGetEffect,
  requestPostEffect,
  requireObjectEffect,
  requireStringEffect,
} from '@/api/shared/request.js';
import type {
  createFromShippingQuoteInputSchema,
  createShippingQuoteInputSchema,
  downloadLabelFileInputSchema,
  getShippingQuoteInputSchema,
  shipmentIdInputSchema,
} from '@/schemas/logistics/logistics.js';
import type { components } from '@/types/sell-apps/order-management/sellLogisticsV1Oas3.js';
import type { InferEffectSchema } from '@/utils/effectSchemaTypes.js';
import { Effect } from 'effect';

/** Input accepted by createShippingQuote. */
export type CreateShippingQuoteInput = InferEffectSchema<typeof createShippingQuoteInputSchema>;

/** Input accepted by getShippingQuote. */
export type GetShippingQuoteInput = InferEffectSchema<typeof getShippingQuoteInputSchema>;

/** Input accepted by createFromShippingQuote. */
export type CreateFromShippingQuoteInput = InferEffectSchema<
  typeof createFromShippingQuoteInputSchema
>;

/** Input accepted by getShipment and cancelShipment. */
export type ShipmentIdInput = InferEffectSchema<typeof shipmentIdInputSchema>;

/** Input accepted by downloadLabelFile. */
export type DownloadLabelFileInput = InferEffectSchema<typeof downloadLabelFileInputSchema>;

/**
 * Generated ShippingQuote response DTO.
 *
 * @see https://developer.ebay.com/api-docs/sell/logistics/resources/shipping_quote/methods/createShippingQuote
 */
export type ShippingQuoteResponse = components['schemas']['ShippingQuote'];

/**
 * Generated Shipment response DTO.
 *
 * @see https://developer.ebay.com/api-docs/sell/logistics/resources/shipment/methods/createFromShippingQuote
 */
export type ShipmentResponse = components['schemas']['Shipment'];

/** Base64 label payload assembled from the binary download_label_file response. */
export interface DownloadedLabelFile {
  /** Shipment the label belongs to. */
  readonly shipmentId: string;
  /** Mime type the label was requested as. */
  readonly contentType: 'application/pdf';
  /** Encoding of `data`; always base64. */
  readonly encoding: 'base64';
  /** Base64-encoded label file bytes. */
  readonly data: string;
  /** Decoded label size in bytes. */
  readonly sizeBytes: number;
}

/** Resolve the required marketplace header from an override or client configuration. */
const marketplaceHeaderConfig = (
  client: EbayApiClient,
  marketplaceId: string | undefined,
): Effect.Effect<EbayRequestConfig, EndpointInputError> => {
  const resolvedMarketplaceId = (marketplaceId ?? client.getConfig().marketplaceId)?.trim();
  if (!resolvedMarketplaceId) {
    return Effect.fail(
      new EndpointInputError({
        parameter: 'marketplaceId',
        message:
          'marketplaceId is required. Provide it in the request or configure EBAY_MARKETPLACE_ID.',
      }),
    );
  }

  return Effect.succeed({
    headers: { 'X-EBAY-C-MARKETPLACE-ID': resolvedMarketplaceId },
    retryServerErrors: false,
  });
};

const requireLogisticsId = (
  value: unknown,
  name: string,
): Effect.Effect<string, EndpointInputError> =>
  requireStringEffect(value, name).pipe(
    Effect.flatMap((id) => {
      const trimmedId = id.trim();
      return trimmedId
        ? Effect.succeed(trimmedId)
        : Effect.fail(
            new EndpointInputError({
              parameter: name,
              message: `${name} is required and must not be blank`,
            }),
          );
    }),
  );

/** Logistics API (v1_beta) endpoints for the domestic USPS quote and label flow. */
export class LogisticsApi {
  private readonly basePath = '/sell/logistics/v1_beta';

  public constructor(private readonly client: EbayApiClient) {}

  /**
   * Creates a shipping quote with rates for a package and its ship-from/ship-to contacts.
   *
   * @param input - Shipping quote request body and optional marketplace header override.
   * @returns An Effect that succeeds with eBay's ShippingQuote.
   *
   * @example
   * ```ts
   * const quote = await Effect.runPromise(
   *   logisticsApi.createShippingQuote({ shippingQuoteRequest: { orders: [{ orderId: '1' }] } }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/logistics/resources/shipping_quote/methods/createShippingQuote
   */
  public createShippingQuote = (
    input: CreateShippingQuoteInput,
  ): Effect.Effect<ShippingQuoteResponse, EbayApiError | EndpointInputError> => {
    const client = this.client;
    const path = `${this.basePath}/shipping_quote`;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<CreateShippingQuoteInput>(input, 'input');
      const shippingQuoteRequest = yield* requireObjectEffect(
        validatedInput.shippingQuoteRequest,
        'shippingQuoteRequest',
      );
      const marketplaceId = yield* optionalStringEffect(
        validatedInput.marketplaceId,
        'marketplaceId',
      );
      const requestConfig = yield* marketplaceHeaderConfig(client, marketplaceId);

      return yield* requestPostEffect<ShippingQuoteResponse>(
        client,
        path,
        shippingQuoteRequest,
        requestConfig,
      );
    });
  };

  /**
   * Retrieves a previously created shipping quote by ID.
   *
   * @param input - Shipping quote identifier.
   * @returns An Effect that succeeds with eBay's ShippingQuote.
   *
   * @example
   * ```ts
   * const quote = await Effect.runPromise(
   *   logisticsApi.getShippingQuote({ shippingQuoteId: 'QUOTE-1' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/logistics/resources/shipping_quote/methods/getShippingQuote
   */
  public getShippingQuote = (
    input: GetShippingQuoteInput,
  ): Effect.Effect<ShippingQuoteResponse, EbayApiError | EndpointInputError> => {
    const client = this.client;
    const basePath = this.basePath;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<GetShippingQuoteInput>(input, 'input');
      const shippingQuoteId = yield* requireLogisticsId(
        validatedInput.shippingQuoteId,
        'shippingQuoteId',
      );

      return yield* requestGetEffect<ShippingQuoteResponse>(
        client,
        `${basePath}/shipping_quote/${encodeURIComponent(shippingQuoteId)}`,
      );
    });
  };

  /**
   * Purchases a shipping label by creating a shipment from a quoted rate.
   *
   * @param input - Create-from-quote request body and optional marketplace header override.
   * @returns An Effect that succeeds with eBay's Shipment.
   *
   * @example
   * ```ts
   * const shipment = await Effect.runPromise(
   *   logisticsApi.createFromShippingQuote({
   *     createShipmentFromQuoteRequest: { shippingQuoteId: 'QUOTE-1', rateId: 'RATE-1' },
   *   }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/logistics/resources/shipment/methods/createFromShippingQuote
   */
  public createFromShippingQuote = (
    input: CreateFromShippingQuoteInput,
  ): Effect.Effect<ShipmentResponse, EbayApiError | EndpointInputError> => {
    const client = this.client;
    const path = `${this.basePath}/shipment/create_from_shipping_quote`;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<CreateFromShippingQuoteInput>(
        input,
        'input',
      );
      const createShipmentFromQuoteRequest = yield* requireObjectEffect(
        validatedInput.createShipmentFromQuoteRequest,
        'createShipmentFromQuoteRequest',
      );
      const marketplaceId = yield* optionalStringEffect(
        validatedInput.marketplaceId,
        'marketplaceId',
      );
      const requestConfig = yield* marketplaceHeaderConfig(client, marketplaceId);

      return yield* requestPostEffect<ShipmentResponse>(
        client,
        path,
        createShipmentFromQuoteRequest,
        requestConfig,
      );
    });
  };

  /**
   * Retrieves a shipment by shipment ID.
   *
   * @param input - Shipment identifier.
   * @returns An Effect that succeeds with eBay's Shipment.
   *
   * @example
   * ```ts
   * const shipment = await Effect.runPromise(logisticsApi.getShipment({ shipmentId: 'SHIP-1' }));
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/logistics/resources/shipment/methods/getShipment
   */
  public getShipment = (
    input: ShipmentIdInput,
  ): Effect.Effect<ShipmentResponse, EbayApiError | EndpointInputError> => {
    const client = this.client;
    const basePath = this.basePath;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<ShipmentIdInput>(input, 'input');
      const shipmentId = yield* requireLogisticsId(validatedInput.shipmentId, 'shipmentId');

      return yield* requestGetEffect<ShipmentResponse>(
        client,
        `${basePath}/shipment/${encodeURIComponent(shipmentId)}`,
      );
    });
  };

  /**
   * Cancels a shipment by shipment ID, voiding its purchased label.
   *
   * @param input - Shipment identifier.
   * @returns An Effect that succeeds with eBay's Shipment reflecting the cancellation.
   *
   * @example
   * ```ts
   * const shipment = await Effect.runPromise(
   *   logisticsApi.cancelShipment({ shipmentId: 'SHIP-1' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/logistics/resources/shipment/methods/cancelShipment
   */
  public cancelShipment = (
    input: ShipmentIdInput,
  ): Effect.Effect<ShipmentResponse, EbayApiError | EndpointInputError> => {
    const client = this.client;
    const basePath = this.basePath;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<ShipmentIdInput>(input, 'input');
      const shipmentId = yield* requireLogisticsId(validatedInput.shipmentId, 'shipmentId');

      return yield* requestPostEffect<ShipmentResponse>(
        client,
        `${basePath}/shipment/${encodeURIComponent(shipmentId)}/cancel`,
        {},
        { retryServerErrors: false },
      );
    });
  };

  /**
   * Downloads a purchased shipping label and returns it as a base64 payload.
   *
   * @param input - Shipment identifier and optional preferred label mime type.
   * @returns An Effect that succeeds with the base64-encoded label file.
   *
   * @example
   * ```ts
   * const label = await Effect.runPromise(
   *   logisticsApi.downloadLabelFile({ shipmentId: 'SHIP-1', accept: 'application/pdf' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/logistics/resources/shipment/methods/downloadLabelFile
   */
  public downloadLabelFile = (
    input: DownloadLabelFileInput,
  ): Effect.Effect<DownloadedLabelFile, EbayApiError | EndpointInputError> => {
    const client = this.client;
    const basePath = this.basePath;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<DownloadLabelFileInput>(input, 'input');
      const shipmentId = yield* requireLogisticsId(validatedInput.shipmentId, 'shipmentId');
      const accept = yield* optionalStringEffect(validatedInput.accept, 'accept');
      if (accept !== undefined && accept !== 'application/pdf') {
        return yield* Effect.fail(
          new EndpointInputError({
            parameter: 'accept',
            message: 'accept must be application/pdf when provided.',
          }),
        );
      }

      const labelBuffer = yield* requestGetEffect<Buffer>(
        client,
        `${basePath}/shipment/${encodeURIComponent(shipmentId)}/download_label_file`,
        undefined,
        {
          headers: { Accept: 'application/pdf' },
          responseType: 'arraybuffer',
        },
      );

      return {
        shipmentId,
        contentType: 'application/pdf',
        encoding: 'base64',
        data: labelBuffer.toString('base64'),
        sizeBytes: labelBuffer.byteLength,
      } satisfies DownloadedLabelFile;
    });
  };
}
