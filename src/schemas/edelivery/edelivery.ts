import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const passthroughObject = () => z.object({}).passthrough();

const emptyResponseSchema = passthroughObject();

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

const packageActionResultSchema = z.object({
  message: z.string().optional(),
  packageId: z.string().optional(),
  resultCode: z.string().optional(),
});

const fdcSkuRequestSchema = z
  .object({
    quantity: z.number().optional(),
    skuNumber: z.string().optional(),
  })
  .passthrough();

const skuRequestSchema = z
  .object({
    elecQualificationId: z.string().optional(),
    fdcSkus: z.array(fdcSkuRequestSchema).optional(),
    height: z.number().optional(),
    isLiBattery: z.boolean().optional(),
    length: z.number().optional(),
    liBatteryType: z.string().optional(),
    nameEn: z.string().optional(),
    nameZh: z.string().optional(),
    origin: z.string().optional(),
    price: amountSchema.optional(),
    remark: z.string().optional(),
    skuNumber: z.string().optional(),
    tariffCode: z.string().optional(),
    weight: z.number().optional(),
    width: z.number().optional(),
  })
  .passthrough();

const itemRequestSchema = z
  .object({
    itemId: z.string().optional(),
    lineItemId: z.string().optional(),
    quantity: z.number().optional(),
    saleRecordId: z.string().optional(),
    sku: skuRequestSchema.optional(),
    transactionId: z.string().optional(),
  })
  .passthrough();

const pickupAddressRequestSchema = z
  .object({
    city: z.string().optional(),
    company: z.string().optional(),
    contact: z.string().optional(),
    countryCode: z.string().optional(),
    district: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    postcode: z.string().optional(),
    province: z.string().optional(),
    street1: z.string().optional(),
    street2: z.string().optional(),
    street3: z.string().optional(),
  })
  .passthrough();

const pickupAddressResponseSchema = pickupAddressRequestSchema.extend({
  cityName: z.string().optional(),
  countryName: z.string().optional(),
  districtName: z.string().optional(),
  provinceName: z.string().optional(),
});

const shipToAddressRequestSchema = z
  .object({
    city: z.string().optional(),
    company: z.string().optional(),
    contact: z.string().optional(),
    countryCode: z.string().optional(),
    countryName: z.string().optional(),
    district: z.string().optional(),
    phone: z.string().optional(),
    postcode: z.string().optional(),
    province: z.string().optional(),
    street1: z.string().optional(),
    street2: z.string().optional(),
    street3: z.string().optional(),
  })
  .passthrough();

const shipToAddressResponseSchema = shipToAddressRequestSchema;

const specialServiceDetailSchema = z
  .object({
    insuranceFee: z.string().optional(),
    packagingType: z.string().optional(),
    signatureType: z.string().optional(),
    specialServiceTypes: z.array(z.string()).optional(),
  })
  .passthrough();

const packageInfoSchema = z
  .object({
    contentType: z.string().optional(),
    items: z.array(itemRequestSchema).optional(),
    packageHeight: z.number().optional(),
    packageLength: z.number().optional(),
    packageWeight: z.number().optional(),
    packageWidth: z.number().optional(),
    shipFromAddressId: z.string().optional(),
    shippingServiceId: z.string().optional(),
    shipToAddress: shipToAddressRequestSchema.optional(),
    specialServiceDetail: specialServiceDetailSchema.optional(),
    valueForCarriage: z.string().optional(),
  })
  .passthrough();

const createPackageRequestSchema = z
  .object({
    packageInfo: packageInfoSchema.optional(),
  })
  .passthrough();

const createPackageResultSchema = z
  .object({
    estimateCost: amountSchema.optional(),
    lastMileTrackingNumber: z.string().optional(),
    packageId: z.string().optional(),
    paymentCost: amountSchema.optional(),
    trackingNumber: z.string().optional(),
  })
  .passthrough();

const createPackageResponseSchema = z
  .object({
    createPackageResult: createPackageResultSchema.optional(),
  })
  .passthrough();

const itemResponseSchema = z
  .object({
    itemId: z.string().optional(),
    lineItemId: z.string().optional(),
    quantity: z.number().optional(),
    saleRecordId: z.string().optional(),
    transactionId: z.string().optional(),
  })
  .passthrough();

const packageDetailSchema = z
  .object({
    createTime: z.string().optional(),
    estimateCost: amountSchema.optional(),
    items: z.array(itemResponseSchema).optional(),
    lastMileTrackingNumber: z.string().optional(),
    packageHeight: z.number().optional(),
    packageId: z.string().optional(),
    packageLength: z.number().optional(),
    packageStatus: z.string().optional(),
    packageWeight: z.number().optional(),
    packageWidth: z.number().optional(),
    paymentCost: amountSchema.optional(),
    shipFromAddressId: z.string().optional(),
    shippingServiceId: z.string().optional(),
    shipToAddress: shipToAddressResponseSchema.optional(),
    trackingNumber: z.string().optional(),
  })
  .passthrough();

const getPackageResponseSchema = z
  .object({
    packageDetail: packageDetailSchema.optional(),
  })
  .passthrough();

const clonePackageResponseSchema = z
  .object({
    clonePackageResult: createPackageResultSchema.optional(),
  })
  .passthrough();

const packageIdsSchema = z
  .object({
    packageIds: z.array(z.string()).optional(),
  })
  .passthrough();

const bulkCancelPackagesRequestSchema = z
  .object({
    requests: packageIdsSchema.optional(),
  })
  .passthrough();

const bulkCancelPackagesResponseSchema = z
  .object({
    responses: z.array(packageActionResultSchema).optional(),
  })
  .passthrough();

const bulkConfirmPackagesRequestSchema = bulkCancelPackagesRequestSchema;
const bulkConfirmPackagesResponseSchema = bulkCancelPackagesResponseSchema;

const bulkDeletePackagesRequestSchema = bulkCancelPackagesRequestSchema;
const bulkDeletePackagesResponseSchema = bulkCancelPackagesResponseSchema;

const itemPackageSchema = z
  .object({
    packageId: z.string().optional(),
    packageStatus: z.string().optional(),
    trackingNumber: z.string().optional(),
  })
  .passthrough();

const getPackagesByLineItemIdResponseSchema = z
  .object({
    itemPackages: z.array(itemPackageSchema).optional(),
  })
  .passthrough();

const createBundleRequestSchema = z
  .object({
    bundle: z
      .object({
        consignPreferenceId: z.string().optional(),
        trackingNumbers: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const createBundleResponseSchema = z
  .object({
    bundle: z
      .object({
        bundleId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const bundleDetailSchema = z
  .object({
    consignPreferenceId: z.string().optional(),
    trackingNumbers: z.array(z.string()).optional(),
  })
  .passthrough();

const getBundleResponseSchema = z
  .object({
    bundleDetail: bundleDetailSchema.optional(),
  })
  .passthrough();

const labelSchema = z
  .object({
    base64Str: z.string().optional(),
  })
  .passthrough();

const getBundleLabelResponseSchema = z
  .object({
    label: labelSchema.optional(),
  })
  .passthrough();

const paginationInputSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});

const serviceDirectionSchema = z
  .object({
    batteryTypes: z.array(z.string()).optional(),
    shipFromCountry: z.string().optional(),
    shipToCountry: z.string().optional(),
  })
  .passthrough();

const serviceInfoSchema = z
  .object({
    descriptionEn: z.string().optional(),
    descriptionHk: z.string().optional(),
    descriptionJp: z.string().optional(),
    descriptionZh: z.string().optional(),
    directions: z.array(serviceDirectionSchema).optional(),
    incoterm: z.string().optional(),
    maxLength: z.number().optional(),
    maxTotalLength: z.number().optional(),
    maxWeight: z.number().optional(),
    nameEn: z.string().optional(),
    nameHk: z.string().optional(),
    nameJp: z.string().optional(),
    nameZh: z.string().optional(),
    shippingServiceId: z.string().optional(),
  })
  .passthrough();

const getServicesResponseSchema = z
  .object({
    serviceList: z
      .object({
        href: z.string().optional(),
        limit: z.number().optional(),
        next: z.string().optional(),
        offset: z.number().optional(),
        prev: z.string().optional(),
        services: z.array(serviceInfoSchema).optional(),
        total: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const getActualCostsInputSchema = z.object({
  package_id: z.string().optional(),
});

const getActualCostsResponseSchema = z
  .object({
    actualCosts: z
      .array(
        z
          .object({
            actualWeight: z.number().optional(),
            amount: amountSchema.optional(),
            billingTime: z.string().optional(),
            chargeMode: z.string().optional(),
            chargeWeight: z.number().optional(),
            costType: z.string().optional(),
            message: z.string().optional(),
            remark: z.string().optional(),
            resultCode: z.string().optional(),
            size: z.string().optional(),
            trackingNumber: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const addressPreferenceDataSchema = z
  .object({
    addressId: z.string().optional(),
    city: z.string().optional(),
    cityName: z.string().optional(),
    company: z.string().optional(),
    contact: z.string().optional(),
    countryCode: z.string().optional(),
    countryName: z.string().optional(),
    district: z.string().optional(),
    districtName: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    postcode: z.string().optional(),
    province: z.string().optional(),
    provinceName: z.string().optional(),
    street1: z.string().optional(),
    street2: z.string().optional(),
    street3: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

const createAddressPreferenceInputSchema = z
  .object({
    shipFromAddress: addressPreferenceDataSchema.optional(),
  })
  .passthrough();

const createAddressPreferenceOutputSchema = z
  .object({
    shipFromAddressId: z
      .object({
        addressId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const getAddressPreferencesOutputSchema = z
  .object({
    shipFromAddresses: z.array(addressPreferenceDataSchema).optional(),
  })
  .passthrough();

const createConsignPreferenceInputSchema = z
  .object({
    consignAddress: z
      .object({
        consignPreferenceName: z.string().optional(),
        dropoffSiteId: z.string().optional(),
        pickupAddress: pickupAddressRequestSchema.optional(),
        pickupTime: z.string().optional(),
        type: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const createConsignPreferenceOutputSchema = z
  .object({
    consignPreferenceId: z
      .object({
        consignPreferenceId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const consignPreferenceSchema = z
  .object({
    consignPreferenceId: z.string().optional(),
    consignPreferenceName: z.string().optional(),
    dropoffSiteId: z.string().optional(),
    pickupAddress: pickupAddressResponseSchema.optional(),
    pickupTime: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

const getConsignPreferencesOutputSchema = z
  .object({
    consignPreferences: z.array(consignPreferenceSchema).optional(),
  })
  .passthrough();

const getAgentsInputSchema = z
  .object({
    ebay_id: z.string().optional(),
    shipping_country: z.string().optional(),
  })
  .passthrough();

const agentPreferenceSchema = z
  .object({
    ebayId: z.string().optional(),
    shippingCountry: z.string().optional(),
  })
  .passthrough();

const agentSchema = z
  .object({
    agentAddress: z.string().optional(),
    agentName: z.string().optional(),
    agentPhone: z.string().optional(),
    agentPreferences: z.array(agentPreferenceSchema).optional(),
    arName: z.string().optional(),
  })
  .passthrough();

const getAgentsOutputSchema = z
  .object({
    agents: z.array(agentSchema).optional(),
  })
  .passthrough();

const getBatteryQualificationsInputSchema = z
  .object({
    battery_type: z.string().optional(),
  })
  .passthrough();

const batteryQualificationSchema = z
  .object({
    batteryType: z.string().optional(),
    elecQualificationId: z.string().optional(),
    elecQualificationName: z.string().optional(),
    expireDate: z.string().optional(),
    remark: z.string().optional(),
  })
  .passthrough();

const getBatteryQualificationsOutputSchema = z
  .object({
    batteryQualifications: z.array(batteryQualificationSchema).optional(),
  })
  .passthrough();

const getDropoffSitesInputSchema = z
  .object({
    country: z.string().optional(),
    postal_code: z.string().optional(),
  })
  .passthrough();

const dropoffSiteSchema = z
  .object({
    address: z.string().optional(),
    city: z.string().optional(),
    countryCode: z.string().optional(),
    dropoffSiteId: z.string().optional(),
    name: z.string().optional(),
    postcode: z.string().optional(),
  })
  .passthrough();

const getDropoffSitesOutputSchema = z
  .object({
    dropoffSites: z.array(dropoffSiteSchema).optional(),
  })
  .passthrough();

const packageIdQueryInputSchema = z
  .object({
    package_id: z.string().optional(),
  })
  .passthrough();

const labelListResponseSchema = z
  .object({
    labels: z.array(labelSchema).optional(),
  })
  .passthrough();

const getHandoverSheetInputSchema = z
  .object({
    bundle_id: z.string().optional(),
  })
  .passthrough();

const handoverSheetResponseSchema = z
  .object({
    handoverSheet: labelSchema.optional(),
  })
  .passthrough();

const getTrackingInputSchema = z
  .object({
    tracking_number: z.string().optional(),
  })
  .passthrough();

const trackingDetailSchema = z
  .object({
    carrier: z.string().optional(),
    events: z.array(passthroughObject()).optional(),
    packageId: z.string().optional(),
    status: z.string().optional(),
    trackingNumber: z.string().optional(),
  })
  .passthrough();

const getTrackingOutputSchema = z
  .object({
    trackingDetail: trackingDetailSchema.optional(),
  })
  .passthrough();

const createComplaintInputSchema = z
  .object({
    complaintRequest: z
      .object({
        affectedPackages: z.array(z.string()).optional(),
        complaintDate: z.string().optional(),
        complaintReason: z.string().optional(),
        complaintType: z.string().optional(),
        preferenceId: z.number().int().optional(),
        remark: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * Convert eDelivery Zod schemas to JSON Schema format for MCP tools.
 */
export function getEdeliveryJsonSchemas() {
  return {
    createPackageInput: zodToJsonSchema(createPackageRequestSchema, 'createPackageInput'),
    createPackageOutput: zodToJsonSchema(createPackageResponseSchema, 'createPackageOutput'),
    getPackageOutput: zodToJsonSchema(getPackageResponseSchema, 'getPackageOutput'),
    deletePackageOutput: zodToJsonSchema(emptyResponseSchema, 'deletePackageOutput'),
    cancelPackageOutput: zodToJsonSchema(emptyResponseSchema, 'cancelPackageOutput'),
    clonePackageOutput: zodToJsonSchema(clonePackageResponseSchema, 'clonePackageOutput'),
    confirmPackageOutput: zodToJsonSchema(emptyResponseSchema, 'confirmPackageOutput'),
    getPackagesByLineItemIdOutput: zodToJsonSchema(
      getPackagesByLineItemIdResponseSchema,
      'getPackagesByLineItemIdOutput'
    ),
    bulkCancelPackagesInput: zodToJsonSchema(
      bulkCancelPackagesRequestSchema,
      'bulkCancelPackagesInput'
    ),
    bulkCancelPackagesOutput: zodToJsonSchema(
      bulkCancelPackagesResponseSchema,
      'bulkCancelPackagesOutput'
    ),
    bulkConfirmPackagesInput: zodToJsonSchema(
      bulkConfirmPackagesRequestSchema,
      'bulkConfirmPackagesInput'
    ),
    bulkConfirmPackagesOutput: zodToJsonSchema(
      bulkConfirmPackagesResponseSchema,
      'bulkConfirmPackagesOutput'
    ),
    bulkDeletePackagesInput: zodToJsonSchema(
      bulkDeletePackagesRequestSchema,
      'bulkDeletePackagesInput'
    ),
    bulkDeletePackagesOutput: zodToJsonSchema(
      bulkDeletePackagesResponseSchema,
      'bulkDeletePackagesOutput'
    ),
    createBundleInput: zodToJsonSchema(createBundleRequestSchema, 'createBundleInput'),
    createBundleOutput: zodToJsonSchema(createBundleResponseSchema, 'createBundleOutput'),
    getBundleOutput: zodToJsonSchema(getBundleResponseSchema, 'getBundleOutput'),
    cancelBundleOutput: zodToJsonSchema(emptyResponseSchema, 'cancelBundleOutput'),
    getBundleLabelOutput: zodToJsonSchema(getBundleLabelResponseSchema, 'getBundleLabelOutput'),
    getServicesInput: zodToJsonSchema(paginationInputSchema, 'getServicesInput'),
    getServicesOutput: zodToJsonSchema(getServicesResponseSchema, 'getServicesOutput'),
    getActualCostsInput: zodToJsonSchema(getActualCostsInputSchema, 'getActualCostsInput'),
    getActualCostsOutput: zodToJsonSchema(getActualCostsResponseSchema, 'getActualCostsOutput'),
    createAddressPreferenceInput: zodToJsonSchema(
      createAddressPreferenceInputSchema,
      'createAddressPreferenceInput'
    ),
    createAddressPreferenceOutput: zodToJsonSchema(
      createAddressPreferenceOutputSchema,
      'createAddressPreferenceOutput'
    ),
    getAddressPreferencesOutput: zodToJsonSchema(
      getAddressPreferencesOutputSchema,
      'getAddressPreferencesOutput'
    ),
    createConsignPreferenceInput: zodToJsonSchema(
      createConsignPreferenceInputSchema,
      'createConsignPreferenceInput'
    ),
    createConsignPreferenceOutput: zodToJsonSchema(
      createConsignPreferenceOutputSchema,
      'createConsignPreferenceOutput'
    ),
    getConsignPreferencesOutput: zodToJsonSchema(
      getConsignPreferencesOutputSchema,
      'getConsignPreferencesOutput'
    ),
    getAgentsInput: zodToJsonSchema(getAgentsInputSchema, 'getAgentsInput'),
    getAgentsOutput: zodToJsonSchema(getAgentsOutputSchema, 'getAgentsOutput'),
    getBatteryQualificationsInput: zodToJsonSchema(
      getBatteryQualificationsInputSchema,
      'getBatteryQualificationsInput'
    ),
    getBatteryQualificationsOutput: zodToJsonSchema(
      getBatteryQualificationsOutputSchema,
      'getBatteryQualificationsOutput'
    ),
    getDropoffSitesInput: zodToJsonSchema(getDropoffSitesInputSchema, 'getDropoffSitesInput'),
    getDropoffSitesOutput: zodToJsonSchema(getDropoffSitesOutputSchema, 'getDropoffSitesOutput'),
    getLabelsInput: zodToJsonSchema(packageIdQueryInputSchema, 'getLabelsInput'),
    getLabelsOutput: zodToJsonSchema(labelListResponseSchema, 'getLabelsOutput'),
    getHandoverSheetInput: zodToJsonSchema(
      getHandoverSheetInputSchema,
      'getHandoverSheetInput'
    ),
    getHandoverSheetOutput: zodToJsonSchema(
      handoverSheetResponseSchema,
      'getHandoverSheetOutput'
    ),
    getTrackingInput: zodToJsonSchema(getTrackingInputSchema, 'getTrackingInput'),
    getTrackingOutput: zodToJsonSchema(getTrackingOutputSchema, 'getTrackingOutput'),
    createComplaintInput: zodToJsonSchema(createComplaintInputSchema, 'createComplaintInput'),
    createComplaintOutput: zodToJsonSchema(emptyResponseSchema, 'createComplaintOutput'),
    error: zodToJsonSchema(errorSchema, 'error'),
    errorParameter: zodToJsonSchema(errorParameterSchema, 'errorParameter'),
    amount: zodToJsonSchema(amountSchema, 'amount'),
    packageInfo: zodToJsonSchema(packageInfoSchema, 'packageInfo'),
    packageDetail: zodToJsonSchema(packageDetailSchema, 'packageDetail'),
    bundleDetail: zodToJsonSchema(bundleDetailSchema, 'bundleDetail'),
    serviceInfo: zodToJsonSchema(serviceInfoSchema, 'serviceInfo'),
    label: zodToJsonSchema(labelSchema, 'label'),
    trackingDetail: zodToJsonSchema(trackingDetailSchema, 'trackingDetail'),
  };
}
