import { z } from '@/utils/effectSchema.js';

/**
 * Executable MCP output contracts for the Sell eDelivery International Shipping API.
 *
 * Shapes follow the eDelivery OpenAPI spec (the source of the generated response
 * types), which corrects several envelopes from the pre-port schemas — e.g.
 * `agentList`/`trackingDetails` wrappers rather than bare `agents`/`trackingDetail`.
 * Every object is `.passthrough()` so undocumented fields eBay adds are surfaced,
 * never rejected: these contracts describe successful responses, they do not
 * filter them.
 *
 * The four 204 No Content operations (cancelBundle, cancelPackage, confirmPackage,
 * deletePackage) and createComplaint (spec response is an unspecified bare object)
 * deliberately have no output contract here: their handlers resolve with no usable
 * body, so advertising a schema would only force `structuredContent` failures.
 *
 * Input schemas for these endpoints stay in `./otherApis.js`.
 */

const amountSchema = z
  .object({
    currency: z.string().optional(),
    value: z.string().optional(),
  })
  .passthrough();

/** Cursor/limit envelope fields shared by the paginated eDelivery list responses. */
const listPaginationShape = {
  href: z.string().optional(),
  limit: z.number().optional(),
  next: z.string().optional(),
  offset: z.number().optional(),
  prev: z.string().optional(),
  total: z.number().optional(),
};

const actualCostSchema = z
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
  .passthrough();

/** Output contract for ebay_edelivery_get_actual_costs. */
export const getActualCostsOutputSchema = z
  .object({
    actualCosts: z.array(actualCostSchema).optional(),
  })
  .passthrough();

const addressPreferenceSchema = z
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

/** Output contract for ebay_edelivery_get_address_preferences. */
export const getAddressPreferencesOutputSchema = z
  .object({
    addressPreferenceList: z
      .object({
        addresses: z.array(addressPreferenceSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_create_address_preference. */
export const createAddressPreferenceOutputSchema = z
  .object({
    shipFromAddressId: z
      .object({
        addressId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const pickupAddressSchema = z
  .object({
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
  })
  .passthrough();

const consignPreferenceSchema = z
  .object({
    consignPreferenceId: z.string().optional(),
    consignPreferenceName: z.string().optional(),
    dropoffSiteId: z.string().optional(),
    pickupAddress: pickupAddressSchema.optional(),
    pickupTime: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_consign_preferences. */
export const getConsignPreferencesOutputSchema = z
  .object({
    consignPreferenceList: z
      .object({
        consignPreferences: z.array(consignPreferenceSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_create_consign_preference. */
export const createConsignPreferenceOutputSchema = z
  .object({
    consignAddressId: z
      .object({
        consignPreferenceId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const agentSchema = z
  .object({
    agentAddress: z.string().optional(),
    agentName: z.string().optional(),
    agentPhone: z.string().optional(),
    agentPreferences: z
      .array(
        z
          .object({
            ebayId: z.string().optional(),
            shippingCountry: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    arName: z.string().optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_agents. */
export const getAgentsOutputSchema = z
  .object({
    agentList: z
      .object({
        ...listPaginationShape,
        agents: z.array(agentSchema).optional(),
      })
      .passthrough()
      .optional(),
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

/** Output contract for ebay_edelivery_get_battery_qualifications. */
export const getBatteryQualificationsOutputSchema = z
  .object({
    batteryQualificationList: z
      .object({
        ...listPaginationShape,
        qualifications: z.array(batteryQualificationSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const dropoffSiteSchema = z
  .object({
    city: z.string().optional(),
    contact: z.string().optional(),
    country: z.string().optional(),
    district: z.string().optional(),
    dropoffSiteId: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    province: z.string().optional(),
    street1: z.string().optional(),
    street2: z.string().optional(),
    street3: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_dropoff_sites. */
export const getDropoffSitesOutputSchema = z
  .object({
    dropoffSiteList: z
      .object({
        ...listPaginationShape,
        dropoffSites: z.array(dropoffSiteSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const serviceSchema = z
  .object({
    descriptionEn: z.string().optional(),
    descriptionHk: z.string().optional(),
    descriptionJp: z.string().optional(),
    descriptionZh: z.string().optional(),
    directions: z
      .array(
        z
          .object({
            batteryType: z.string().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
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

/** Output contract for ebay_edelivery_get_services. */
export const getServicesOutputSchema = z
  .object({
    serviceList: z
      .object({
        ...listPaginationShape,
        services: z.array(serviceSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_create_bundle. */
export const createBundleOutputSchema = z
  .object({
    bundle: z
      .object({
        bundleId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_bundle. */
export const getBundleOutputSchema = z
  .object({
    bundleDetail: z
      .object({
        consignPreferenceId: z.string().optional(),
        trackingNumbers: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** Base64 document payload returned for bundle labels and handover sheets. */
const base64DocumentSchema = z
  .object({
    base64Str: z.string().optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_bundle_label. */
export const getBundleLabelOutputSchema = z
  .object({
    label: base64DocumentSchema.optional(),
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

/** Output contract for ebay_edelivery_create_package. */
export const createPackageOutputSchema = z
  .object({
    createPackageResult: createPackageResultSchema.optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_clone_package. */
export const clonePackageOutputSchema = z
  .object({
    clonePackageResult: z
      .object({
        lastMileTrackingNumber: z.string().optional(),
        packageId: z.string().optional(),
        paymentCost: amountSchema.optional(),
        trackingNumber: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const packageItemSchema = z
  .object({
    buyerId: z.string().optional(),
    itemTitle: z.string().optional(),
    listingId: z.string().optional(),
    orderId: z.string().optional(),
    orderLineItem: z.string().optional(),
    postedQuantity: z.number().optional(),
    soldDate: z.string().optional(),
    soldPrice: amountSchema.optional(),
    soldQuantity: z.number().optional(),
    transactionId: z.string().optional(),
  })
  .passthrough();

const packageDetailSchema = z
  .object({
    agentInfoResponse: z
      .object({
        agentAddress: z.string().optional(),
        agentName: z.string().optional(),
        agentPhone: z.string().optional(),
      })
      .passthrough()
      .optional(),
    consignPreferenceId: z.string().optional(),
    incoterm: z.string().optional(),
    items: z.array(packageItemSchema).optional(),
    lastMileTrackingNumber: z.string().optional(),
    packageComment: z.string().optional(),
    packageHeight: z.number().optional(),
    packageId: z.string().optional(),
    packageLength: z.number().optional(),
    packageStatus: z.string().optional(),
    packageWeight: z.number().optional(),
    packageWidth: z.number().optional(),
    paymentCost: amountSchema.optional(),
    shipFromAddressId: z.string().optional(),
    shippingServiceId: z.string().optional(),
    shipToAddress: pickupAddressSchema.optional(),
    specialServiceDetail: z
      .object({
        insuranceFee: z.string().optional(),
        packagingType: z.string().optional(),
        signatureType: z.string().optional(),
        specialServiceTypes: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    valueForCarriage: z.string().optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_package. */
export const getPackageOutputSchema = z
  .object({
    packageDetail: packageDetailSchema.optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_packages_by_line_item_id. */
export const getPackagesByLineItemIdOutputSchema = z
  .object({
    itemPackages: z
      .array(
        z
          .object({
            packageId: z.string().optional(),
            packageStatus: z.string().optional(),
            trackingNumber: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

/**
 * Shared output contract for the three bulk package operations
 * (bulk cancel/confirm/delete), which all return per-package action results.
 */
export const bulkPackageActionOutputSchema = z
  .object({
    responses: z
      .array(
        z
          .object({
            message: z.string().optional(),
            packageId: z.string().optional(),
            resultCode: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_labels. */
export const getLabelsOutputSchema = z
  .object({
    labels: z
      .array(
        z
          .object({
            base64Str: z.string().optional(),
            message: z.string().optional(),
            resultCode: z.string().optional(),
            trackingNumber: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_handover_sheet. */
export const getHandoverSheetOutputSchema = z
  .object({
    handoverSheet: base64DocumentSchema.optional(),
  })
  .passthrough();

/** Output contract for ebay_edelivery_get_tracking. */
export const getTrackingOutputSchema = z
  .object({
    trackingDetails: z
      .array(
        z
          .object({
            city: z.string().optional(),
            country: z.string().optional(),
            descriptionEn: z.string().optional(),
            descriptionZh: z.string().optional(),
            district: z.string().optional(),
            eventPostalCode: z.string().optional(),
            eventTime: z.string().optional(),
            province: z.string().optional(),
            status: z.string().optional(),
            trackingNumber: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();
