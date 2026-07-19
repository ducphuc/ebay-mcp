import {
  getBillingActivitiesInputSchema,
  getOrderEarningsByIdInputSchema,
  getOrderEarningsInputSchema,
  getOrderEarningsSummaryInputSchema,
  getPayoutInputSchema,
  getPayoutsInputSchema,
  getPayoutSummaryInputSchema,
  getSellerFundsSummaryInputSchema,
  getTransactionsInputSchema,
  getTransactionSummaryInputSchema,
  getTransferInputSchema,
} from '@/schemas/finances/finances.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

const financesScopeRequirement =
  'Required OAuth Scope: sell.finances\nMinimum Scope: https://api.ebay.com/oauth/api_scope/sell.finances';

const orderEarningsScopeRequirement =
  'Required OAuth Scope: sell.finances.earnings.read (restricted; request access through an eBay application growth check)\nMinimum Scope: https://api.ebay.com/oauth/api_scope/sell.finances.earnings.read';

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/** Finances API tools for seller payouts, transactions, transfers, and funds summaries. */
export const financesEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_finances_get_transactions',
    description: `Retrieve the seller's monetary transactions (sales, refunds, credits, disputes, shipping labels, and more), with optional filter, sort, and pagination.\n\n${financesScopeRequirement}`,
    inputSchema: getTransactionsInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getTransactions(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_transaction_summary',
    description: `Retrieve counts and amounts of the seller's monetary transactions. The filter must include transactionStatus; additional criteria can be comma-separated in the same filter expression.\n\n${financesScopeRequirement}`,
    inputSchema: getTransactionSummaryInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getTransactionSummary(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_payouts',
    description: `Retrieve the seller's payouts, including pending and completed payouts, with optional filter, sort, and pagination.\n\n${financesScopeRequirement}`,
    inputSchema: getPayoutsInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getPayouts(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_payout',
    description: `Retrieve the details of a specific seller payout by payout ID.\n\n${financesScopeRequirement}`,
    inputSchema: getPayoutInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getPayout(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_payout_summary',
    description: `Retrieve counts and amounts of the seller's payouts matching an optional filter.\n\n${financesScopeRequirement}`,
    inputSchema: getPayoutSummaryInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getPayoutSummary(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_seller_funds_summary',
    description: `Retrieve the seller's current balance of order funds available, on hold, and processing for payout.\n\n${financesScopeRequirement}`,
    inputSchema: getSellerFundsSummaryInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api) => Effect.runPromise(api.finances.getSellerFundsSummary()),
  }),
  defineTool({
    name: 'ebay_finances_get_transfer',
    description: `Retrieve the details of a TRANSFER transaction, where the seller reimbursed eBay, by transfer ID.\n\n${financesScopeRequirement}`,
    inputSchema: getTransferInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getTransfer(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_order_earnings',
    description: `Retrieve per-order earnings breakdowns (net earnings, fees, taxes) for the seller's orders, with an optional orderCreationDate filter, sort, and pagination.\n\n${orderEarningsScopeRequirement}`,
    inputSchema: getOrderEarningsInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getOrderEarnings(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_order_earnings_by_id',
    description: `Retrieve the earnings breakdown for a single order by order ID.\n\n${orderEarningsScopeRequirement}`,
    inputSchema: getOrderEarningsByIdInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getOrderEarningsById(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_order_earnings_summary',
    description: `Retrieve aggregate earnings totals across the seller's orders matching an optional orderCreationDate filter.\n\n${orderEarningsScopeRequirement}`,
    inputSchema: getOrderEarningsSummaryInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getOrderEarningsSummary(args)),
  }),
  defineTool({
    name: 'ebay_finances_get_billing_activities',
    description: `Retrieve the seller's billing activity line items (fees, credits, and other non-sale charges). eBay expects exactly one of a transactionDate range, orderId, listingId, or billingCycleId filter value.\n\n${financesScopeRequirement}`,
    inputSchema: getBillingActivitiesInputSchema.shape,
    annotations: readOnlyAnnotations,
    handler: (api, args) => Effect.runPromise(api.finances.getBillingActivities(args)),
  }),
];
