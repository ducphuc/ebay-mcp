import { z } from '@/utils/effectSchema.js';

const nonEmptyStringSchema = z.string().regex(/\S/);

const transactionFilterSchema = z
  .string()
  .optional()
  .describe(
    'Transaction filter expression using transactionDate, transactionType, transactionStatus, buyerUsername, payoutId, transactionId, orderId, or payoutReference, e.g. "transactionDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]"',
  );

const payoutFilterSchema = z
  .string()
  .optional()
  .describe(
    'Payout filter expression using payoutDate, lastAttemptedPayoutDate, payoutStatus, or payoutReference; use payoutDate (not transactionDate) for date ranges, e.g. "payoutDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]"',
  );

const payoutSummaryFilterSchema = z
  .string()
  .optional()
  .describe(
    'Payout summary filter using payoutDate and/or payoutStatus; use payoutDate (not transactionDate) for date ranges, e.g. "payoutDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]"',
  );

const sortSchema = z
  .string()
  .optional()
  .describe('Sort field; prefix with "-" for ascending order (default is descending by date)');

const offsetSchema = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe('Zero-based offset of the first record to return (default 0)');

/** Tool input schema for ebay_finances_get_transactions (getTransactions). */
export const getTransactionsInputSchema = z.object({
  filter: transactionFilterSchema,
  sort: sortSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Transactions per page (default 20, max 1000)'),
  offset: offsetSchema,
});

/** Tool input schema for ebay_finances_get_transaction_summary (getTransactionSummary). */
export const getTransactionSummaryInputSchema = z.object({
  filter: nonEmptyStringSchema.describe(
    'Required eBay filter that must include transactionStatus, e.g. "transactionStatus:{PAYOUT},transactionDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]"',
  ),
});

/** Tool input schema for ebay_finances_get_payouts (getPayouts). */
export const getPayoutsInputSchema = z.object({
  filter: payoutFilterSchema,
  sort: sortSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Payouts per page (default 20, max 200)'),
  offset: offsetSchema,
});

/** Tool input schema for ebay_finances_get_payout (getPayout). */
export const getPayoutInputSchema = z.object({
  payoutId: nonEmptyStringSchema.describe('Unique identifier of the payout to retrieve'),
});

/** Tool input schema for ebay_finances_get_payout_summary (getPayoutSummary). */
export const getPayoutSummaryInputSchema = z.object({
  filter: payoutSummaryFilterSchema,
});

/** Tool input schema for ebay_finances_get_seller_funds_summary (getSellerFundsSummary). */
export const getSellerFundsSummaryInputSchema = z.object({});

/** Tool input schema for ebay_finances_get_transfer (getTransfer). */
export const getTransferInputSchema = z.object({
  transferId: nonEmptyStringSchema.describe('Unique identifier of the TRANSFER transaction'),
});

/** Tool input schema for ebay_finances_get_order_earnings (getOrderEarnings). */
export const getOrderEarningsInputSchema = z.object({
  filter: z
    .string()
    .optional()
    .describe(
      'eBay filter expression on orderCreationDate (the only supported filter), e.g. "orderCreationDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]"',
    ),
  sort: z
    .string()
    .optional()
    .describe('Sort order; only orderCreationDate is supported (ascending by default)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Order earnings per page (default 20, max 200)'),
  offset: offsetSchema,
});

/** Tool input schema for ebay_finances_get_order_earnings_by_id (getOrderEarningsById). */
export const getOrderEarningsByIdInputSchema = z.object({
  orderId: nonEmptyStringSchema.describe('Unique identifier of the order to retrieve earnings for'),
});

/** Tool input schema for ebay_finances_get_order_earnings_summary (getOrderEarningsSummary). */
export const getOrderEarningsSummaryInputSchema = z.object({
  filter: z
    .string()
    .optional()
    .describe(
      'eBay filter expression on orderCreationDate, e.g. "orderCreationDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]"',
    ),
});

/** Tool input schema for ebay_finances_get_billing_activities (getBillingActivities). */
export const getBillingActivitiesInputSchema = z.object({
  filter: nonEmptyStringSchema.describe(
    'Required eBay filter expression containing exactly one of transactionDate, orderId, listingId, or billingCycleId',
  ),
  sort: sortSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Billing activities per page (default 100, max 200)'),
  offset: offsetSchema,
});
