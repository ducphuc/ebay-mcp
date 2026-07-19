import {
  createFromShippingQuoteInputSchema,
  createShippingQuoteInputSchema,
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
      'Create a USPS shipping quote using order, package specification, and ship-from/ship-to details (Logistics API v1_beta)',
    inputSchema: createShippingQuoteInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.logistics.createShippingQuote(args)),
  }),
  defineTool({
    name: 'ebay_logistics_get_shipping_quote',
    description: 'Get a Logistics shipping quote by ID',
    inputSchema: getShippingQuoteInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.logistics.getShippingQuote(args)),
  }),
  defineTool({
    name: 'ebay_logistics_create_from_shipping_quote',
    description: 'Purchase a label by creating a shipment from a shipping quote',
    inputSchema: createFromShippingQuoteInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.logistics.createFromShippingQuote(args)),
  }),
  defineTool({
    name: 'ebay_logistics_get_shipment',
    description: 'Get a Logistics shipment by shipment ID',
    inputSchema: shipmentIdInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.logistics.getShipment(args)),
  }),
  defineTool({
    name: 'ebay_logistics_cancel_shipment',
    description: 'Cancel a Logistics shipment by shipment ID',
    inputSchema: shipmentIdInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.logistics.cancelShipment(args)),
  }),
  defineTool({
    name: 'ebay_logistics_download_label_file',
    description: 'Download a purchased Logistics label file (returns base64 payload)',
    inputSchema: downloadLabelFileInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.logistics.downloadLabelFile(args)),
  }),
];
