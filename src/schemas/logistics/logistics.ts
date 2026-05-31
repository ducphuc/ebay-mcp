import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const errorParameterSchema = z.object({
  name: z.string().optional(),
  value: z.string().optional(),
});

const errorSchema = z.object({
  category: z.string().optional(),
  domain: z.string().optional(),
  errorId: z.number().int().optional(),
  inputRefIds: z.array(z.string()).optional(),
  longMessage: z.string().optional(),
  message: z.string().optional(),
  outputRefIds: z.array(z.string()).optional(),
  parameters: z.array(errorParameterSchema).optional(),
  subdomain: z.string().optional(),
});

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

const pickupSlotSchema = z.object({
  pickupSlotEndTime: z.string().optional(),
  pickupSlotId: z.string().optional(),
  pickupSlotStartTime: z.string().optional(),
  pickupSlotTimeZone: z.string().optional(),
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

const createShippingQuoteRequestSchema = z.object({
  orders: z.array(orderSchema).optional(),
  packageSpecification: packageSpecificationSchema.optional(),
  shipFrom: contactSchema.optional(),
  shipTo: contactSchema.optional(),
});

const rateSchema = z.object({
  additionalOptions: z.array(additionalOptionSchema).optional(),
  baseShippingCost: amountSchema.optional(),
  destinationTimeZone: z.string().optional(),
  maxEstimatedDeliveryDate: z.string().optional(),
  minEstimatedDeliveryDate: z.string().optional(),
  pickupNetworks: z.array(z.string()).optional(),
  pickupSlots: z.array(pickupSlotSchema).optional(),
  pickupType: z.string().optional(),
  rateId: z.string().optional(),
  rateRecommendation: z.array(z.string()).optional(),
  shippingCarrierCode: z.string().optional(),
  shippingCarrierName: z.string().optional(),
  shippingServiceCode: z.string().optional(),
  shippingServiceName: z.string().optional(),
});

const shippingQuoteSchema = z.object({
  creationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  orders: z.array(orderSchema).optional(),
  packageSpecification: packageSpecificationSchema.optional(),
  rates: z.array(rateSchema).optional(),
  shippingQuoteId: z.string().optional(),
  shipFrom: contactSchema.optional(),
  shipTo: contactSchema.optional(),
  warnings: z.array(errorSchema).optional(),
});

const createFromShippingQuoteRequestSchema = z.object({
  shippingQuoteId: z.string(),
  rateId: z.string(),
  labelCustomMessage: z.string().optional(),
  labelSize: z.string().optional(),
  returnTo: contactSchema.optional(),
  additionalOptions: z.array(additionalOptionSchema).optional(),
});

const purchasedRateSchema = z.object({
  additionalOptions: z.array(additionalOptionSchema).optional(),
  baseShippingCost: amountSchema.optional(),
  destinationTimeZone: z.string().optional(),
  maxEstimatedDeliveryDate: z.string().optional(),
  minEstimatedDeliveryDate: z.string().optional(),
  pickupNetworks: z.array(z.string()).optional(),
  pickupSlotId: z.string().optional(),
  pickupType: z.string().optional(),
  rateId: z.string().optional(),
  shippingCarrierCode: z.string().optional(),
  shippingCarrierName: z.string().optional(),
  shippingQuoteId: z.string().optional(),
  shippingServiceCode: z.string().optional(),
  shippingServiceName: z.string().optional(),
  totalShippingCost: amountSchema.optional(),
});

const shipmentCancellationSchema = z.object({
  cancellationRequestedDate: z.string().optional(),
  cancellationStatus: z.string().optional(),
});

const shipmentSchema = z.object({
  cancellation: shipmentCancellationSchema.optional(),
  creationDate: z.string().optional(),
  labelCustomMessage: z.string().optional(),
  labelDownloadUrl: z.string().optional(),
  labelSize: z.string().optional(),
  orders: z.array(orderSchema).optional(),
  packageSpecification: packageSpecificationSchema.optional(),
  rate: purchasedRateSchema.optional(),
  returnTo: contactSchema.optional(),
  shipFrom: contactSchema.optional(),
  shipmentId: z.string().optional(),
  shipmentTrackingNumber: z.string().optional(),
  shipTo: contactSchema.optional(),
});

const downloadLabelFileResponseSchema = z.object({
  shipmentId: z.string(),
  contentType: z.string(),
  encoding: z.literal('base64'),
  data: z.string(),
  sizeBytes: z.number().int(),
});

export function getLogisticsJsonSchemas() {
  return {
    createShippingQuoteInput: zodToJsonSchema(
      createShippingQuoteRequestSchema,
      'createShippingQuoteInput'
    ),
    createShippingQuoteOutput: zodToJsonSchema(shippingQuoteSchema, 'createShippingQuoteOutput'),
    getShippingQuoteOutput: zodToJsonSchema(shippingQuoteSchema, 'getShippingQuoteOutput'),
    createFromShippingQuoteInput: zodToJsonSchema(
      createFromShippingQuoteRequestSchema,
      'createFromShippingQuoteInput'
    ),
    createFromShippingQuoteOutput: zodToJsonSchema(shipmentSchema, 'createFromShippingQuoteOutput'),
    getShipmentOutput: zodToJsonSchema(shipmentSchema, 'getShipmentOutput'),
    cancelShipmentOutput: zodToJsonSchema(shipmentSchema, 'cancelShipmentOutput'),
    downloadLabelFileOutput: zodToJsonSchema(
      downloadLabelFileResponseSchema,
      'downloadLabelFileOutput'
    ),
    error: zodToJsonSchema(errorSchema, 'error'),
    errorParameter: zodToJsonSchema(errorParameterSchema, 'errorParameter'),
    amount: zodToJsonSchema(amountSchema, 'amount'),
    address: zodToJsonSchema(addressSchema, 'address'),
    contact: zodToJsonSchema(contactSchema, 'contact'),
    dimensions: zodToJsonSchema(dimensionsSchema, 'dimensions'),
    weight: zodToJsonSchema(weightSchema, 'weight'),
    additionalOption: zodToJsonSchema(additionalOptionSchema, 'additionalOption'),
    order: zodToJsonSchema(orderSchema, 'order'),
    packageSpecification: zodToJsonSchema(packageSpecificationSchema, 'packageSpecification'),
    pickupSlot: zodToJsonSchema(pickupSlotSchema, 'pickupSlot'),
    rate: zodToJsonSchema(rateSchema, 'rate'),
    purchasedRate: zodToJsonSchema(purchasedRateSchema, 'purchasedRate'),
    shipment: zodToJsonSchema(shipmentSchema, 'shipment'),
    shipmentCancellation: zodToJsonSchema(shipmentCancellationSchema, 'shipmentCancellation'),
    shippingQuote: zodToJsonSchema(shippingQuoteSchema, 'shippingQuote'),
  };
}
