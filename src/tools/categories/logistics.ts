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

/** Logistics API tools for the domestic USPS quote and label flow. */
export const logisticsEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_logistics_create_shipping_quote',
    description:
      'Create a domestic-US USPS shipping quote using the Limited Release Logistics API. Requires an approved eBay application and the sell.logistics OAuth scope.',
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
    description: 'Get a Logistics shipping quote by ID',
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
    description:
      'Purchase a domestic-US USPS label from a quote using the Limited Release Logistics API. This financially consequential operation requires sell.logistics. Label purchase can fail with 403 insufficient-permissions unless eBay has approved the application for the limited-release sell.logistics scope; the other Logistics methods are not similarly gated.',
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
    description: 'Get a Logistics shipment by shipment ID',
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
    description: 'Cancel a Logistics shipment by shipment ID',
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
    description: 'Download a purchased Logistics PDF label file as a base64 payload',
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
