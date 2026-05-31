import { z } from 'zod';
import {
  edeliveryAddressPreferenceSchema,
  edeliveryBulkPackageActionRequestSchema,
  edeliveryBundleRequestSchema,
  edeliveryConsignPreferenceSchema,
  edeliveryPackageRequestSchema,
  logisticsCreateShipmentFromQuoteRequestSchema,
  shippingQuoteRequestSchema,
  veroReportDataSchema,
} from '../schemas.js';
import type { OutputArgs, ToolDefinition } from '../tool-definitions.js';

/** Miscellaneous eBay API tools that do not fit the primary seller API categories. */
export const otherApiTools: ToolDefinition[] = [
  // Identity API
  {
    name: 'ebay_get_user',
    description: 'Get user identity information',
    inputSchema: {},
  },
  // Compliance API
  {
    name: 'ebay_get_listing_violations',
    description: 'Get listing violations for the seller',
    inputSchema: {
      complianceType: z.string().optional().describe('Type of compliance violation'),
      offset: z.number().optional().describe('Number of violations to skip'),
      limit: z.number().optional().describe('Number of violations to return'),
    },
  },
  {
    name: 'ebay_get_listing_violations_summary',
    description: 'Get summary of listing violations',
    inputSchema: {
      complianceType: z.string().optional().describe('Type of compliance violation'),
    },
  },
  {
    name: 'ebay_suppress_violation',
    description: 'Suppress a listing violation',
    inputSchema: {
      listingViolationId: z.string().describe('The violation ID to suppress'),
    },
  },
  // VERO API
  {
    name: 'ebay_create_vero_report',
    description:
      'Create a VERO report to report intellectual property infringement. This endpoint is part of the Verified Rights Owner (VeRO) Program and allows rights owners to report listings that infringe on their intellectual property.',
    inputSchema: {
      reportData: veroReportDataSchema.describe(
        'VERO report data containing item details and intellectual property violation information'
      ),
    },
  },
  {
    name: 'ebay_get_vero_report',
    description: 'Get a specific VERO report by ID',
    inputSchema: {
      veroReportId: z.string().min(1).describe('The unique identifier of the VERO report'),
    },
  },
  {
    name: 'ebay_get_vero_report_items',
    description:
      'Get VERO report items (listings reported for intellectual property infringement). Supports filtering, pagination via limit and offset parameters.',
    inputSchema: {
      filter: z.string().optional().describe('Filter criteria for the query (e.g., date range)'),
      limit: z.number().optional().describe('Maximum number of items to return'),
      offset: z.number().optional().describe('Number of items to skip for pagination'),
    },
  },
  {
    name: 'ebay_get_vero_reason_code',
    description:
      'Get a specific VERO reason code by ID. Reason codes categorize the types of intellectual property violations.',
    inputSchema: {
      veroReasonCodeId: z.string().min(1).describe('The unique identifier of the VERO reason code'),
    },
  },
  {
    name: 'ebay_get_vero_reason_codes',
    description:
      'Get all available VERO reason codes. These codes are used when creating VERO reports to specify the type of intellectual property violation.',
    inputSchema: {},
  },
  // Translation API
  {
    name: 'ebay_translate',
    description: 'Translate listing text',
    inputSchema: {
      from: z.string().describe('Source language code'),
      to: z.string().describe('Target language code'),
      translationContext: z
        .string()
        .describe('Translation context (e.g., ITEM_TITLE, ITEM_DESCRIPTION)'),
      text: z.array(z.string()).describe('Array of text to translate'),
    },
  },
  // Logistics API (canonical names)
  {
    name: 'ebay_logistics_create_shipping_quote',
    description:
      'Create a USPS shipping quote using order, package specification, and ship-from/ship-to details (Logistics API v1_beta)',
    inputSchema: {
      shippingQuoteRequest: shippingQuoteRequestSchema.describe('Shipping quote request details'),
    },
  },
  {
    name: 'ebay_logistics_get_shipping_quote',
    description: 'Get a Logistics shipping quote by ID',
    inputSchema: {
      shippingQuoteId: z.string().describe('The shipping quote ID'),
    },
  },
  {
    name: 'ebay_logistics_create_from_shipping_quote',
    description: 'Purchase a label by creating a shipment from a shipping quote',
    inputSchema: {
      createShipmentFromQuoteRequest: logisticsCreateShipmentFromQuoteRequestSchema.describe(
        'Create-from-quote request containing selected rate and optional add-ons'
      ),
    },
  },
  {
    name: 'ebay_logistics_get_shipment',
    description: 'Get a Logistics shipment by shipment ID',
    inputSchema: {
      shipmentId: z.string().describe('The shipment ID'),
    },
  },
  {
    name: 'ebay_logistics_cancel_shipment',
    description: 'Cancel a Logistics shipment by shipment ID',
    inputSchema: {
      shipmentId: z.string().describe('The shipment ID to cancel'),
    },
  },
  {
    name: 'ebay_logistics_download_label_file',
    description: 'Download a purchased Logistics label file (returns base64 payload)',
    inputSchema: {
      shipmentId: z.string().describe('The shipment ID'),
      accept: z
        .enum(['application/pdf', 'image/png'])
        .optional()
        .describe('Preferred label mime type. Defaults to application/pdf'),
    },
  },
  // eDelivery International Shipping API (canonical names)
  {
    name: 'ebay_edelivery_get_actual_costs',
    description: 'Get actual costs for international shipped packages',
    inputSchema: {
      params: z.record(z.string()).optional().describe('Query parameters (e.g., package_id)'),
    },
  },
  {
    name: 'ebay_edelivery_get_address_preferences',
    description: 'Get address preferences for international shipping',
    inputSchema: {},
  },
  {
    name: 'ebay_edelivery_create_address_preference',
    description: 'Create an address preference for international shipping',
    inputSchema: {
      addressPreference: edeliveryAddressPreferenceSchema.describe('Address preference data'),
    },
  },
  {
    name: 'ebay_edelivery_get_consign_preferences',
    description: 'Get consign preferences for international shipping',
    inputSchema: {},
  },
  {
    name: 'ebay_edelivery_create_consign_preference',
    description: 'Create a consign preference for international shipping',
    inputSchema: {
      consignPreference: edeliveryConsignPreferenceSchema.describe('Consign preference data'),
    },
  },
  {
    name: 'ebay_edelivery_get_agents',
    description: 'Get available shipping agents for international shipping',
    inputSchema: {
      params: z.record(z.string()).optional().describe('Query parameters (e.g., country)'),
    },
  },
  {
    name: 'ebay_edelivery_get_battery_qualifications',
    description: 'Get battery qualifications for international shipping',
    inputSchema: {
      params: z.record(z.string()).optional().describe('Query parameters (e.g., battery_type)'),
    },
  },
  {
    name: 'ebay_edelivery_get_dropoff_sites',
    description: 'Get available dropoff sites for international shipping',
    inputSchema: {
      params: z.record(z.string()).describe('Query parameters (postal_code, country required)'),
    },
  },
  {
    name: 'ebay_edelivery_get_services',
    description: 'Get available shipping services for international shipping',
    inputSchema: {
      params: z.record(z.string()).optional().describe('Query parameters (e.g., country)'),
    },
  },
  {
    name: 'ebay_edelivery_create_bundle',
    description: 'Create a bundle of packages for international shipping',
    inputSchema: {
      bundleRequest: edeliveryBundleRequestSchema.describe('Bundle creation data'),
    },
  },
  {
    name: 'ebay_edelivery_get_bundle',
    description: 'Get bundle details by ID',
    inputSchema: {
      bundleId: z.string().describe('The bundle ID'),
    },
  },
  {
    name: 'ebay_edelivery_cancel_bundle',
    description: 'Cancel a bundle by ID',
    inputSchema: {
      bundleId: z.string().describe('The bundle ID to cancel'),
    },
  },
  {
    name: 'ebay_edelivery_get_bundle_label',
    description: 'Get shipping label for a bundle',
    inputSchema: {
      bundleId: z.string().describe('The bundle ID'),
    },
  },
  {
    name: 'ebay_edelivery_create_package',
    description: 'Create a package for international shipping',
    inputSchema: {
      packageRequest: edeliveryPackageRequestSchema.describe('Package creation data'),
    },
  },
  {
    name: 'ebay_edelivery_get_package',
    description: 'Get package details by ID',
    inputSchema: {
      packageId: z.string().describe('The package ID'),
    },
  },
  {
    name: 'ebay_edelivery_delete_package',
    description: 'Delete a package by ID',
    inputSchema: {
      packageId: z.string().describe('The package ID to delete'),
    },
  },
  {
    name: 'ebay_edelivery_get_packages_by_line_item_id',
    description: 'Get package details by order line item ID',
    inputSchema: {
      orderLineItemId: z.string().describe('The order line item ID'),
    },
  },
  {
    name: 'ebay_edelivery_cancel_package',
    description: 'Cancel a package by ID',
    inputSchema: {
      packageId: z.string().describe('The package ID to cancel'),
    },
  },
  {
    name: 'ebay_edelivery_clone_package',
    description: 'Clone a package to create a duplicate',
    inputSchema: {
      packageId: z.string().describe('The package ID to clone'),
    },
  },
  {
    name: 'ebay_edelivery_confirm_package',
    description: 'Confirm a package for shipping',
    inputSchema: {
      packageId: z.string().describe('The package ID to confirm'),
    },
  },
  {
    name: 'ebay_edelivery_bulk_cancel_packages',
    description: 'Cancel multiple packages in one request',
    inputSchema: {
      bulkCancelRequest: edeliveryBulkPackageActionRequestSchema.describe(
        'Bulk cancel request data'
      ),
    },
  },
  {
    name: 'ebay_edelivery_bulk_confirm_packages',
    description: 'Confirm multiple packages in one request',
    inputSchema: {
      bulkConfirmRequest: edeliveryBulkPackageActionRequestSchema.describe(
        'Bulk confirm request data'
      ),
    },
  },
  {
    name: 'ebay_edelivery_bulk_delete_packages',
    description: 'Delete multiple packages in one request',
    inputSchema: {
      bulkDeleteRequest: edeliveryBulkPackageActionRequestSchema.describe(
        'Bulk delete request data'
      ),
    },
  },
  {
    name: 'ebay_edelivery_get_labels',
    description: 'Get shipping labels for packages',
    inputSchema: {
      params: z.record(z.string()).optional().describe('Query parameters (e.g., package_id)'),
    },
  },
  {
    name: 'ebay_edelivery_get_handover_sheet',
    description: 'Get handover sheet for packages',
    inputSchema: {
      params: z.record(z.string()).optional().describe('Query parameters (e.g., bundle_id)'),
    },
  },
  {
    name: 'ebay_edelivery_get_tracking',
    description: 'Get tracking information for packages',
    inputSchema: {
      params: z.record(z.string()).describe('Query parameters (tracking_number required)'),
    },
  },
  {
    name: 'ebay_edelivery_create_complaint',
    description: 'Create a complaint for international shipping issues',
    inputSchema: {
      complaintRequest: z.record(z.unknown()).describe('Complaint request data'),
    },
    outputSchema: {
      type: 'object',
      properties: {},
      description: 'Success response',
    } as OutputArgs,
  },
];

/** Claude-facing utility tools for fetch, prompt, artifact, and completion helpers. */
export const claudeTools: ToolDefinition[] = [
  {
    name: 'SearchClaudeCodeDocs',
    description:
      'Search across the Claude Code Docs knowledge base to find relevant information, code examples, API references, and guides. Use this tool when you need to answer questions about Claude Code Docs, find specific documentation, understand how features work, or locate implementation details. The search returns contextual content with titles and direct links to the documentation pages.',
    inputSchema: {
      query: z.string().describe('A query to search the content with.'),
    },
    outputSchema: {
      type: 'object',
      properties: {},
      description: 'Success response',
    } as OutputArgs,
  },
];
