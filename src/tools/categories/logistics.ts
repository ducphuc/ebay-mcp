import {
  createFromShippingQuoteInputSchema,
  createShippingQuoteInputSchema,
  downloadedLabelOutputSchema,
  downloadLabelFileInputSchema,
  getShippingQuoteInputSchema,
  shipmentIdInputSchema,
} from '@/schemas/logistics/logistics.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

const logisticsAccessRequirement =
  'Requires an eBay-approved Limited Release application and the sell.logistics OAuth scope.';

/** Logistics API tools for the domestic USPS quote and label flow. */
export const logisticsEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_logistics_create_shipping_quote',
    description: `Create a domestic-US USPS shipping quote using the Limited Release Logistics API. ${logisticsAccessRequirement}`,
    inputSchema: createShippingQuoteInputSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.logistics.createShippingQuote(args)),
  }),
  defineTool({
    name: 'ebay_logistics_get_shipping_quote',
    description: `Get a Logistics shipping quote by ID. ${logisticsAccessRequirement}`,
    inputSchema: getShippingQuoteInputSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.logistics.getShippingQuote(args)),
  }),
  defineTool({
    name: 'ebay_logistics_create_from_shipping_quote',
    description: `Purchase a domestic-US USPS label from a quote using the Limited Release Logistics API. This is financially consequential. ${logisticsAccessRequirement}`,
    inputSchema: createFromShippingQuoteInputSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.logistics.createFromShippingQuote(args)),
  }),
  defineTool({
    name: 'ebay_logistics_get_shipment',
    description: `Get a Logistics shipment by shipment ID. ${logisticsAccessRequirement}`,
    inputSchema: shipmentIdInputSchema.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.logistics.getShipment(args)),
  }),
  defineTool({
    name: 'ebay_logistics_cancel_shipment',
    description: `Cancel a Logistics shipment by shipment ID. ${logisticsAccessRequirement}`,
    inputSchema: shipmentIdInputSchema.shape,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.logistics.cancelShipment(args)),
  }),
  defineTool({
    name: 'ebay_logistics_download_label_file',
    description: `Download a purchased Logistics PDF label file as a base64 payload. ${logisticsAccessRequirement}`,
    inputSchema: downloadLabelFileInputSchema.shape,
    wireOutputSchema: downloadedLabelOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.logistics.downloadLabelFile(args)),
  }),
];
