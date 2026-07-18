import { z } from '@/utils/effectSchema.js';
import { LOGISTICS_SUPPORTED_COUNTRY_CODES } from '@/config/logistics.js';

const nonEmptyStringSchema = z.string().regex(/\S/);
const positiveDecimalStringSchema = z
  .string()
  .regex(/^(?:0*[1-9]\d*)(?:\.\d+)?$|^0*\.\d*[1-9]\d*$/);

const amountSchema = z.object({
  currency: z.string().optional(),
  value: positiveDecimalStringSchema.optional(),
});

const addressSchema = z.object({
  addressLine1: nonEmptyStringSchema,
  addressLine2: z.string().optional(),
  city: nonEmptyStringSchema,
  stateOrProvince: nonEmptyStringSchema,
  postalCode: nonEmptyStringSchema,
  countryCode: z.enum(LOGISTICS_SUPPORTED_COUNTRY_CODES),
  county: z.string().optional(),
});

const contactSchema = z.object({
  companyName: z.string().optional(),
  contactAddress: addressSchema,
  fullName: nonEmptyStringSchema,
  primaryPhone: z
    .object({
      phoneNumber: z.string().optional(),
    })
    .optional(),
});

const dimensionsSchema = z.object({
  height: positiveDecimalStringSchema,
  length: positiveDecimalStringSchema,
  width: positiveDecimalStringSchema,
  unit: z.enum(['INCH', 'FEET', 'CENTIMETER', 'METER']),
});

const weightSchema = z.object({
  value: positiveDecimalStringSchema,
  unit: z.enum(['GRAM', 'KILOGRAM', 'OUNCE', 'POUND']),
});

const additionalOptionSchema = z.object({
  additionalCost: amountSchema.optional(),
  optionType: nonEmptyStringSchema,
});

const orderSchema = z.object({
  channel: z.enum(['EBAY']).optional(),
  orderId: nonEmptyStringSchema,
});

const packageSpecificationSchema = z.object({
  dimensions: dimensionsSchema,
  weight: weightSchema,
});

/** ShippingQuoteRequest body schema for createShippingQuote (Logistics API v1_beta). */
export const createShippingQuoteRequestSchema = z.object({
  orders: z.array(orderSchema).min(1).max(10),
  packageSpecification: packageSpecificationSchema,
  shipFrom: contactSchema,
  shipTo: contactSchema,
});

/** CreateShipmentFromQuoteRequest body schema for createFromShippingQuote. */
export const createFromShippingQuoteRequestSchema = z.object({
  shippingQuoteId: nonEmptyStringSchema,
  rateId: nonEmptyStringSchema,
  labelCustomMessage: z.string().optional(),
  labelSize: z.enum(['4"x6"']).optional(),
  returnTo: contactSchema.optional(),
  additionalOptions: z.array(additionalOptionSchema).optional(),
});

const marketplaceIdSchema = nonEmptyStringSchema
  .optional()
  .describe('Optional X-EBAY-C-MARKETPLACE-ID header override for this request');

/** Tool input schema for ebay_logistics_create_shipping_quote. */
export const createShippingQuoteInputSchema = z.object({
  shippingQuoteRequest: createShippingQuoteRequestSchema.describe('Shipping quote request details'),
  marketplaceId: marketplaceIdSchema,
});

/** Tool input schema for ebay_logistics_get_shipping_quote. */
export const getShippingQuoteInputSchema = z.object({
  shippingQuoteId: nonEmptyStringSchema.describe('The shipping quote ID'),
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
  shipmentId: nonEmptyStringSchema.describe('The shipment ID'),
});

/** Tool input schema for ebay_logistics_download_label_file. */
export const downloadLabelFileInputSchema = z.object({
  shipmentId: nonEmptyStringSchema.describe('The shipment ID'),
  accept: z
    .enum(['application/pdf'])
    .optional()
    .describe('Label mime type. The Logistics API supports application/pdf'),
});

/** Executable MCP output contract for a downloaded Logistics label. */
export const downloadedLabelOutputSchema = z.object({
  shipmentId: nonEmptyStringSchema,
  contentType: z.enum(['application/pdf']),
  encoding: z.enum(['base64']),
  data: z.string(),
  sizeBytes: z.number().int().min(0),
});
