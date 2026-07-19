import { z } from '@/utils/effectSchema.js';

const amountSchema = z.object({
  currency: z.string().optional(),
  value: z.string().optional(),
});

const addressSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  stateOrProvince: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().optional(),
  county: z.string().optional(),
});

const contactSchema = z.object({
  companyName: z.string().optional(),
  contactAddress: addressSchema.optional(),
  fullName: z.string().optional(),
  primaryPhone: z
    .object({
      phoneNumber: z.string().optional(),
    })
    .optional(),
});

const dimensionsSchema = z.object({
  height: z.string().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  unit: z.string().optional(),
});

const weightSchema = z.object({
  value: z.string().optional(),
  unit: z.string().optional(),
});

const additionalOptionSchema = z.object({
  additionalCost: amountSchema.optional(),
  optionType: z.string().optional(),
});

const orderSchema = z.object({
  channel: z.string().optional(),
  orderId: z.string().optional(),
});

const packageSpecificationSchema = z.object({
  dimensions: dimensionsSchema.optional(),
  weight: weightSchema.optional(),
});

/** ShippingQuoteRequest body schema for createShippingQuote (Logistics API v1_beta). */
export const createShippingQuoteRequestSchema = z.object({
  orders: z.array(orderSchema).optional(),
  packageSpecification: packageSpecificationSchema.optional(),
  shipFrom: contactSchema.optional(),
  shipTo: contactSchema.optional(),
});

/** CreateShipmentFromQuoteRequest body schema for createFromShippingQuote. */
export const createFromShippingQuoteRequestSchema = z.object({
  shippingQuoteId: z.string(),
  rateId: z.string(),
  labelCustomMessage: z.string().optional(),
  labelSize: z.string().optional(),
  returnTo: contactSchema.optional(),
  additionalOptions: z.array(additionalOptionSchema).optional(),
});

const marketplaceIdSchema = z
  .string()
  .optional()
  .describe('Optional X-EBAY-C-MARKETPLACE-ID header override for this request');

/** Tool input schema for ebay_logistics_create_shipping_quote. */
export const createShippingQuoteInputSchema = z.object({
  shippingQuoteRequest: createShippingQuoteRequestSchema.describe('Shipping quote request details'),
  marketplaceId: marketplaceIdSchema,
});

/** Tool input schema for ebay_logistics_get_shipping_quote. */
export const getShippingQuoteInputSchema = z.object({
  shippingQuoteId: z.string().describe('The shipping quote ID'),
});

/** Tool input schema for ebay_logistics_create_from_shipping_quote. */
export const createFromShippingQuoteInputSchema = z.object({
  createShipmentFromQuoteRequest: createFromShippingQuoteRequestSchema.describe(
    'Create-from-quote request containing selected rate and optional add-ons',
  ),
  marketplaceId: marketplaceIdSchema,
});

/** Tool input schema for ebay_logistics_get_shipment and ebay_logistics_cancel_shipment. */
export const shipmentIdInputSchema = z.object({
  shipmentId: z.string().describe('The shipment ID'),
});

/** Tool input schema for ebay_logistics_download_label_file. */
export const downloadLabelFileInputSchema = z.object({
  shipmentId: z.string().describe('The shipment ID'),
  accept: z
    .enum(['application/pdf', 'image/png'])
    .optional()
    .describe('Preferred label mime type. Defaults to application/pdf'),
});
