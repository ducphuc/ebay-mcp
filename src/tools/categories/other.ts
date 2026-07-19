import { Effect } from 'effect';
import {
  bulkPackageActionOutputSchema,
  clonePackageOutputSchema,
  createAddressPreferenceOutputSchema,
  createBundleOutputSchema,
  createConsignPreferenceOutputSchema,
  createPackageOutputSchema,
  getActualCostsOutputSchema,
  getAddressPreferencesOutputSchema,
  getAgentsOutputSchema,
  getBatteryQualificationsOutputSchema,
  getBundleLabelOutputSchema,
  getBundleOutputSchema,
  getConsignPreferencesOutputSchema,
  getDropoffSitesOutputSchema,
  getHandoverSheetOutputSchema,
  getLabelsOutputSchema,
  getPackageOutputSchema,
  getPackagesByLineItemIdOutputSchema,
  getServicesOutputSchema,
  getTrackingOutputSchema,
} from '@/schemas/other/edelivery.js';
import {
  bundleIdInputSchema,
  createVeroReportInputSchema,
  edeliveryBodyInputSchema,
  edeliveryPaginationInputSchema,
  getActualCostsInputSchema,
  getAddressPreferencesInputSchema,
  getConsignPreferencesInputSchema,
  getHandoverSheetInputSchema,
  getLabelsInputSchema,
  getListingViolationsInputSchema,
  getListingViolationsSummaryInputSchema,
  getPackagesByLineItemIdInputSchema,
  getTrackingInputSchema,
  getUserInputSchema,
  getVeroReasonCodeInputSchema,
  getVeroReasonCodesInputSchema,
  getVeroReportInputSchema,
  getVeroReportItemsInputSchema,
  packageIdInputSchema,
  translateInputSchema,
} from '@/schemas/other/otherApis.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';

/** Miscellaneous eBay API tools that do not fit the primary seller API categories. */
export const otherEntries: ToolEntry[] = [
  // Identity API
  defineTool({
    name: 'ebay_get_user',
    description: 'Get user identity information',
    inputSchema: getUserInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.identity.getUser(args)),
  }),
  // Compliance API
  defineTool({
    name: 'ebay_get_listing_violations',
    description: 'Get listing violations for the seller',
    inputSchema: getListingViolationsInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.compliance.getListingViolations(args)),
  }),
  defineTool({
    name: 'ebay_get_listing_violations_summary',
    description: 'Get summary of listing violations',
    inputSchema: getListingViolationsSummaryInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.compliance.getListingViolationsSummary(args)),
  }),
  // VERO API
  defineTool({
    name: 'ebay_create_vero_report',
    description:
      'Create a VERO report to report intellectual property infringement. This endpoint is part of the Verified Rights Owner (VeRO) Program and allows rights owners to report listings that infringe on their intellectual property.',
    inputSchema: createVeroReportInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.vero.createVeroReport(args)),
  }),
  defineTool({
    name: 'ebay_get_vero_report',
    description: 'Get a specific VERO report by ID',
    inputSchema: getVeroReportInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.vero.getVeroReport(args)),
  }),
  defineTool({
    name: 'ebay_get_vero_report_items',
    description:
      'Get VERO report items (listings reported for intellectual property infringement). Supports filtering, pagination via limit and offset parameters.',
    inputSchema: getVeroReportItemsInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.vero.getVeroReportItems(args)),
  }),
  defineTool({
    name: 'ebay_get_vero_reason_code',
    description:
      'Get a specific VERO reason code by ID. Reason codes categorize the types of intellectual property violations.',
    inputSchema: getVeroReasonCodeInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.vero.getVeroReasonCode(args)),
  }),
  defineTool({
    name: 'ebay_get_vero_reason_codes',
    description:
      'Get all available VERO reason codes. These codes are used when creating VERO reports to specify the type of intellectual property violation.',
    inputSchema: getVeroReasonCodesInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.vero.getVeroReasonCodes(args)),
  }),
  // Translation API
  defineTool({
    name: 'ebay_translate',
    description: 'Translate listing text',
    inputSchema: translateInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.translation.translate(args)),
  }),
  // eDelivery API - Cost & Preferences
  defineTool({
    name: 'ebay_edelivery_get_actual_costs',
    description: 'Get actual costs for shipped packages',
    inputSchema: getActualCostsInputSchema.shape,
    wireOutputSchema: getActualCostsOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getActualCosts(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_address_preferences',
    description: 'Get address preferences for international shipping',
    inputSchema: getAddressPreferencesInputSchema.shape,
    wireOutputSchema: getAddressPreferencesOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getAddressPreferences(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_create_address_preference',
    description: 'Create an address preference for international shipping',
    inputSchema: edeliveryBodyInputSchema.shape,
    wireOutputSchema: createAddressPreferenceOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.createAddressPreference(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_consign_preferences',
    description: 'Get consign preferences for international shipping',
    inputSchema: getConsignPreferencesInputSchema.shape,
    wireOutputSchema: getConsignPreferencesOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getConsignPreferences(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_create_consign_preference',
    description: 'Create a consign preference for international shipping',
    inputSchema: edeliveryBodyInputSchema.shape,
    wireOutputSchema: createConsignPreferenceOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.createConsignPreference(args)),
  }),
  // eDelivery API - Agents & Services
  defineTool({
    name: 'ebay_edelivery_get_agents',
    description: 'Get available shipping agents for international shipping',
    inputSchema: edeliveryPaginationInputSchema.shape,
    wireOutputSchema: getAgentsOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getAgents(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_battery_qualifications',
    description: 'Get battery qualifications for international shipping',
    inputSchema: edeliveryPaginationInputSchema.shape,
    wireOutputSchema: getBatteryQualificationsOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getBatteryQualifications(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_dropoff_sites',
    description: 'Get available dropoff sites for international shipping',
    inputSchema: edeliveryPaginationInputSchema.shape,
    wireOutputSchema: getDropoffSitesOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getDropoffSites(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_services',
    description: 'Get available shipping services for international shipping',
    inputSchema: edeliveryPaginationInputSchema.shape,
    wireOutputSchema: getServicesOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getServices(args)),
  }),
  // eDelivery API - Bundles
  defineTool({
    name: 'ebay_edelivery_create_bundle',
    description: 'Create a bundle of packages for international shipping',
    inputSchema: edeliveryBodyInputSchema.shape,
    wireOutputSchema: createBundleOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.createBundle(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_bundle',
    description: 'Get bundle details by ID',
    inputSchema: bundleIdInputSchema.shape,
    wireOutputSchema: getBundleOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getBundle(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_cancel_bundle',
    description: 'Cancel a bundle by ID',
    inputSchema: bundleIdInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.edelivery.cancelBundle(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_bundle_label',
    description: 'Get shipping label for a bundle',
    inputSchema: bundleIdInputSchema.shape,
    wireOutputSchema: getBundleLabelOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getBundleLabel(args)),
  }),
  // eDelivery API - Packages (Single)
  defineTool({
    name: 'ebay_edelivery_create_package',
    description: 'Create a package for international shipping',
    inputSchema: edeliveryBodyInputSchema.shape,
    wireOutputSchema: createPackageOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.createPackage(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_package',
    description: 'Get package details by ID',
    inputSchema: packageIdInputSchema.shape,
    wireOutputSchema: getPackageOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getPackage(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_delete_package',
    description: 'Delete a package by ID',
    inputSchema: packageIdInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.edelivery.deletePackage(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_packages_by_line_item_id',
    description: 'Get package details by order line item ID',
    inputSchema: getPackagesByLineItemIdInputSchema.shape,
    wireOutputSchema: getPackagesByLineItemIdOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getPackagesByLineItemId(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_cancel_package',
    description: 'Cancel a package by ID',
    inputSchema: packageIdInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.edelivery.cancelPackage(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_clone_package',
    description: 'Clone a package to create a duplicate',
    inputSchema: packageIdInputSchema.shape,
    wireOutputSchema: clonePackageOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.clonePackage(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_confirm_package',
    description: 'Confirm a package for shipping',
    inputSchema: packageIdInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.edelivery.confirmPackage(args)),
  }),
  // eDelivery API - Packages (Bulk)
  defineTool({
    name: 'ebay_edelivery_bulk_cancel_packages',
    description: 'Cancel multiple packages in one request',
    inputSchema: edeliveryBodyInputSchema.shape,
    wireOutputSchema: bulkPackageActionOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.bulkCancelPackages(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_bulk_confirm_packages',
    description: 'Confirm multiple packages in one request',
    inputSchema: edeliveryBodyInputSchema.shape,
    wireOutputSchema: bulkPackageActionOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.bulkConfirmPackages(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_bulk_delete_packages',
    description: 'Delete multiple packages in one request',
    inputSchema: edeliveryBodyInputSchema.shape,
    wireOutputSchema: bulkPackageActionOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.bulkDeletePackages(args)),
  }),
  // eDelivery API - Labels & Tracking
  defineTool({
    name: 'ebay_edelivery_get_labels',
    description: 'Get shipping labels for packages',
    inputSchema: getLabelsInputSchema.shape,
    wireOutputSchema: getLabelsOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getLabels(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_handover_sheet',
    description: 'Get handover sheet for packages',
    inputSchema: getHandoverSheetInputSchema.shape,
    wireOutputSchema: getHandoverSheetOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getHandoverSheet(args)),
  }),
  defineTool({
    name: 'ebay_edelivery_get_tracking',
    description: 'Get tracking information for packages',
    inputSchema: getTrackingInputSchema.shape,
    wireOutputSchema: getTrackingOutputSchema,
    handler: (api, args) => Effect.runPromise(api.edelivery.getTracking(args)),
  }),
  // eDelivery API - Other
  defineTool({
    name: 'ebay_edelivery_create_complaint',
    description: 'Create a complaint for international shipping issues',
    inputSchema: edeliveryBodyInputSchema.shape,
    // No wire output contract: the spec's 201 response is an unspecified bare
    // object, so there is no field shape to advertise as structuredContent.
    handler: (api, args) => Effect.runPromise(api.edelivery.createComplaint(args)),
  }),
];
