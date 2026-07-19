import type { EbayApiClient } from '@/api/client.js';
import {
  buildEndpointParams,
  type EbayApiError,
  EndpointInputError,
  optionalNonNegativeNumberEffect,
  optionalPositiveNumberEffect,
  optionalStringEffect,
  requestGetEffect,
  requireStringEffect,
} from '@/api/shared/request.js';
import type { EbayEnvironment } from '@/config/environment.js';
import { getBaseUrl, getFinancesBaseUrl } from '@/config/environment.js';
import type {
  getBillingActivitiesInputSchema,
  getOrderEarningsByIdInputSchema,
  getOrderEarningsInputSchema,
  getOrderEarningsSummaryInputSchema,
  getPayoutInputSchema,
  getPayoutsInputSchema,
  getPayoutSummaryInputSchema,
  getTransactionsInputSchema,
  getTransactionSummaryInputSchema,
  getTransferInputSchema,
} from '@/schemas/finances/finances.js';
import type { components } from '@/types/sell-apps/account-management/sellFinancesV1Oas3.js';
import type { InferEffectSchema } from '@/utils/effectSchemaTypes.js';
import { Effect } from 'effect';

const transactionSummaryRequiredFilter = 'transactionStatus';
const transactionFilterKeys = new Set([
  'transactionDate',
  'transactionType',
  'transactionStatus',
  'buyerUsername',
  'payoutId',
  'transactionId',
  'orderId',
  'payoutReference',
]);
const transactionSummaryFilterKeys = new Set([
  'transactionStatus',
  'transactionDate',
  'transactionType',
  'buyerUsername',
  'payoutId',
  'transactionId',
  'orderId',
]);
const payoutFilterKeys = new Set([
  'payoutDate',
  'lastAttemptedPayoutDate',
  'payoutStatus',
  'payoutReference',
]);
const payoutSummaryFilterKeys = new Set(['payoutDate', 'payoutStatus']);
const orderEarningsFilterKeys = new Set(['orderCreationDate']);
const billingFilterKeys = new Set(['transactionDate', 'orderId', 'listingId', 'billingCycleId']);

const filterKeys = (filter: string): string[] =>
  Array.from(filter.matchAll(/(?:^|,)\s*([A-Za-z][A-Za-z0-9]*)\s*:/g), (match) => match[1]);

const validateFilterKeysEffect = (
  filter: string | undefined,
  allowedKeys: ReadonlySet<string>,
  requiredKey?: string,
  exactKeyCount?: number,
): Effect.Effect<string | undefined, EndpointInputError> => {
  if (filter === undefined) {
    if (requiredKey !== undefined || (exactKeyCount !== undefined && exactKeyCount > 0)) {
      const requirement = requiredKey ?? `exactly ${exactKeyCount} criterion`;
      return Effect.fail(
        new EndpointInputError({
          parameter: 'filter',
          message: `filter must include ${requirement}`,
        }),
      );
    }
    return Effect.succeed(undefined);
  }

  const keys = filterKeys(filter);
  if (keys.length === 0) {
    return Effect.fail(
      new EndpointInputError({
        parameter: 'filter',
        message: 'filter must contain at least one valid criterion',
      }),
    );
  }
  const unsupportedKey = keys.find((key) => !allowedKeys.has(key));
  if (unsupportedKey !== undefined) {
    return Effect.fail(
      new EndpointInputError({
        parameter: 'filter',
        message: `filter criterion ${unsupportedKey} is not supported by this endpoint`,
      }),
    );
  }
  if (requiredKey !== undefined && !keys.includes(requiredKey)) {
    return Effect.fail(
      new EndpointInputError({
        parameter: 'filter',
        message: `filter must include ${requiredKey}`,
      }),
    );
  }
  if (exactKeyCount !== undefined && keys.length !== exactKeyCount) {
    return Effect.fail(
      new EndpointInputError({
        parameter: 'filter',
        message: `filter must contain exactly ${exactKeyCount} criterion${exactKeyCount === 1 ? '' : 's'}`,
      }),
    );
  }
  return Effect.succeed(filter);
};

/** Input accepted by getTransactions. */
export type GetTransactionsInput = InferEffectSchema<typeof getTransactionsInputSchema>;

/** Input accepted by getTransactionSummary. */
export type GetTransactionSummaryInput = InferEffectSchema<typeof getTransactionSummaryInputSchema>;

/** Input accepted by getPayouts. */
export type GetPayoutsInput = InferEffectSchema<typeof getPayoutsInputSchema>;

/** Input accepted by getPayout. */
export type GetPayoutInput = InferEffectSchema<typeof getPayoutInputSchema>;

/** Input accepted by getPayoutSummary. */
export type GetPayoutSummaryInput = InferEffectSchema<typeof getPayoutSummaryInputSchema>;

/** Input accepted by getTransfer. */
export type GetTransferInput = InferEffectSchema<typeof getTransferInputSchema>;

/** Input accepted by getOrderEarnings. */
export type GetOrderEarningsInput = InferEffectSchema<typeof getOrderEarningsInputSchema>;

/** Input accepted by getOrderEarningsById. */
export type GetOrderEarningsByIdInput = InferEffectSchema<typeof getOrderEarningsByIdInputSchema>;

/** Input accepted by getOrderEarningsSummary. */
export type GetOrderEarningsSummaryInput = InferEffectSchema<
  typeof getOrderEarningsSummaryInputSchema
>;

/** Input accepted by getBillingActivities. */
export type GetBillingActivitiesInput = InferEffectSchema<typeof getBillingActivitiesInputSchema>;

/**
 * Generated paged collection of seller monetary transactions.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/transaction/methods/getTransactions
 */
export type Transactions = components['schemas']['Transactions'];

/**
 * Generated transaction count summary response.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/transaction/methods/getTransactionSummary
 */
export type TransactionSummaryResponse = components['schemas']['TransactionSummaryResponse'];

/**
 * Generated paged collection of seller payouts.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/payout/methods/getPayouts
 */
export type Payouts = components['schemas']['Payouts'];

/**
 * Generated payout detail response.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/payout/methods/getPayout
 */
export type Payout = components['schemas']['Payout'];

/**
 * Generated payout count/amount summary response.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/payout/methods/getPayoutSummary
 */
export type PayoutSummaryResponse = components['schemas']['PayoutSummaryResponse'];

/**
 * Generated seller funds summary response.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/seller_funds_summary/methods/getSellerFundsSummary
 */
export type SellerFundsSummaryResponse = components['schemas']['SellerFundsSummaryResponse'];

/**
 * Generated transfer detail response.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/transfer/methods/getTransfer
 */
export type Transfer = components['schemas']['Transfer'];

/**
 * Generated paged collection of per-order earnings breakdowns.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/order_earnings/methods/getOrderEarnings
 */
export type OrderEarnings = components['schemas']['OrderEarnings'];

/**
 * Generated earnings breakdown for a single order.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/order_earnings/methods/getOrderEarningsById
 */
export type OrderEarning = components['schemas']['OrderEarning'];

/**
 * Generated aggregate earnings summary across orders.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/order_earnings_summary/methods/getOrderEarningsSummary
 */
export type OrderEarningsSummary = components['schemas']['OrderEarningsSummary'];

/**
 * Generated paged collection of billing activity line items.
 *
 * @see https://developer.ebay.com/api-docs/sell/finances/resources/billing_activity/methods/getBillingActivities
 */
export type BillingActivityResponse = components['schemas']['BillingActivityResponse'];

/** Sell Finances API endpoints for seller payouts, transactions, transfers, and funds. */
export class FinancesApi {
  private readonly basePath = '/sell/finances/v1';
  private readonly financesBaseUrl: string;
  private readonly billingBaseUrl: string;

  /**
   * @param client - eBay REST client that owns auth and transport details.
   * @param environment - eBay environment selecting the Finances host.
   * @param apiBaseUrl - Optional base URL override (`EBAY_MCP_API_BASE_URL`), used for
   * proxy setups where all traffic must flow through one gateway.
   */
  public constructor(
    private readonly client: EbayApiClient,
    environment: EbayEnvironment = 'production',
    apiBaseUrl?: string,
  ) {
    this.financesBaseUrl = getFinancesBaseUrl(environment, apiBaseUrl);
    this.billingBaseUrl = getBaseUrl(environment, apiBaseUrl);
  }

  /**
   * Retrieves the seller's monetary transactions (sales, refunds, credits, disputes, and more).
   *
   * @param input - Optional filter/sort expressions and pagination controls.
   * @returns An Effect that succeeds with the paged transactions collection.
   *
   * @example
   * ```ts
   * const transactions = await Effect.runPromise(
   *   financesApi.getTransactions({ filter: 'transactionType:{SALE}', limit: 50 }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/transaction/methods/getTransactions
   */
  public getTransactions = (
    input: GetTransactionsInput = {},
  ): Effect.Effect<Transactions, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const rawFilter = yield* optionalStringEffect(input.filter, 'filter');
      const filter = yield* validateFilterKeysEffect(rawFilter, transactionFilterKeys);
      const sort = yield* optionalStringEffect(input.sort, 'sort');
      const limit = yield* optionalPositiveNumberEffect(input.limit, 'limit');
      const offset = yield* optionalNonNegativeNumberEffect(input.offset, 'offset');
      const path = `${this.basePath}/transaction`;
      const params = buildEndpointParams({
        filter: { wireName: 'filter', value: filter },
        sort: { wireName: 'sort', value: sort },
        limit: { wireName: 'limit', value: limit === undefined ? undefined : String(limit) },
        offset: { wireName: 'offset', value: offset === undefined ? undefined : String(offset) },
      });
      const response = yield* requestGetEffect<Transactions | undefined>(
        this.client,
        path,
        params,
        {
          baseURL: this.financesBaseUrl,
        },
      );
      return (
        response ?? {
          href: path,
          limit: limit ?? 20,
          offset: offset ?? 0,
          total: 0,
          transactions: [],
        }
      );
    });

  /**
   * Retrieves counts and amounts of the seller's transactions matching a filter.
   *
   * @param input - Required filter expression containing transactionStatus.
   * @returns An Effect that succeeds with the transaction summary response.
   *
   * @example
   * ```ts
   * const summary = await Effect.runPromise(
   *   financesApi.getTransactionSummary({ filter: 'transactionStatus:{PAYOUT}' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/transaction/methods/getTransactionSummary
   */
  public getTransactionSummary = (
    input: GetTransactionSummaryInput,
  ): Effect.Effect<TransactionSummaryResponse, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const rawFilter = yield* optionalStringEffect(input?.filter, 'filter');
      const filter = yield* validateFilterKeysEffect(
        rawFilter,
        transactionSummaryFilterKeys,
        transactionSummaryRequiredFilter,
      );
      const path = `${this.basePath}/transaction_summary`;
      const params = buildEndpointParams({
        filter: { wireName: 'filter', value: filter },
      });
      return yield* requestGetEffect<TransactionSummaryResponse>(this.client, path, params, {
        baseURL: this.financesBaseUrl,
      });
    });

  /**
   * Retrieves the seller's payouts, including pending and completed payouts.
   *
   * @param input - Optional filter/sort expressions and pagination controls.
   * @returns An Effect that succeeds with the paged payouts collection.
   *
   * @example
   * ```ts
   * const payouts = await Effect.runPromise(
   *   financesApi.getPayouts({ filter: 'payoutStatus:{SUCCEEDED}', limit: 20 }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/payout/methods/getPayouts
   */
  public getPayouts = (
    input: GetPayoutsInput = {},
  ): Effect.Effect<Payouts, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const rawFilter = yield* optionalStringEffect(input.filter, 'filter');
      const filter = yield* validateFilterKeysEffect(rawFilter, payoutFilterKeys);
      const sort = yield* optionalStringEffect(input.sort, 'sort');
      const limit = yield* optionalPositiveNumberEffect(input.limit, 'limit');
      const offset = yield* optionalNonNegativeNumberEffect(input.offset, 'offset');
      const path = `${this.basePath}/payout`;
      const params = buildEndpointParams({
        filter: { wireName: 'filter', value: filter },
        sort: { wireName: 'sort', value: sort },
        limit: { wireName: 'limit', value: limit === undefined ? undefined : String(limit) },
        offset: { wireName: 'offset', value: offset === undefined ? undefined : String(offset) },
      });
      const response = yield* requestGetEffect<Payouts | undefined>(this.client, path, params, {
        baseURL: this.financesBaseUrl,
      });
      return (
        response ?? {
          href: path,
          limit: limit ?? 20,
          offset: offset ?? 0,
          total: 0,
          payouts: [],
        }
      );
    });

  /**
   * Retrieves the details of a specific seller payout.
   *
   * @param input - Identifier of the payout to retrieve.
   * @returns An Effect that succeeds with the payout details.
   *
   * @example
   * ```ts
   * const payout = await Effect.runPromise(financesApi.getPayout({ payoutId: '5********8' }));
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/payout/methods/getPayout
   */
  public getPayout = (
    input: GetPayoutInput,
  ): Effect.Effect<Payout, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const payoutId = yield* requireStringEffect(input?.payoutId, 'payoutId');
      const path = `${this.basePath}/payout/${encodeURIComponent(payoutId)}`;
      return yield* requestGetEffect<Payout>(this.client, path, undefined, {
        baseURL: this.financesBaseUrl,
      });
    });

  /**
   * Retrieves counts and amounts of the seller's payouts matching a filter.
   *
   * @param input - Optional filter expression restricting the summarized payouts.
   * @returns An Effect that succeeds with the payout summary response.
   *
   * @example
   * ```ts
   * const summary = await Effect.runPromise(
   *   financesApi.getPayoutSummary({ filter: 'payoutStatus:{SUCCEEDED}' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/payout/methods/getPayoutSummary
   */
  public getPayoutSummary = (
    input: GetPayoutSummaryInput = {},
  ): Effect.Effect<PayoutSummaryResponse, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const rawFilter = yield* optionalStringEffect(input.filter, 'filter');
      const filter = yield* validateFilterKeysEffect(rawFilter, payoutSummaryFilterKeys);
      const path = `${this.basePath}/payout_summary`;
      const params = buildEndpointParams({
        filter: { wireName: 'filter', value: filter },
      });
      return yield* requestGetEffect<PayoutSummaryResponse>(this.client, path, params, {
        baseURL: this.financesBaseUrl,
      });
    });

  /**
   * Retrieves the seller's current balance of funds available, on hold, and processing for payout.
   *
   * @returns An Effect that succeeds with the seller funds summary.
   *
   * @example
   * ```ts
   * const funds = await Effect.runPromise(financesApi.getSellerFundsSummary());
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/seller_funds_summary/methods/getSellerFundsSummary
   */
  public getSellerFundsSummary = (): Effect.Effect<SellerFundsSummaryResponse, EbayApiError> =>
    requestGetEffect<SellerFundsSummaryResponse>(
      this.client,
      `${this.basePath}/seller_funds_summary`,
      undefined,
      { baseURL: this.financesBaseUrl },
    );

  /**
   * Retrieves the details of a TRANSFER transaction, where the seller reimbursed eBay.
   *
   * @param input - Identifier of the TRANSFER transaction to retrieve.
   * @returns An Effect that succeeds with the transfer details.
   *
   * @example
   * ```ts
   * const transfer = await Effect.runPromise(financesApi.getTransfer({ transferId: '1********2' }));
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/transfer/methods/getTransfer
   */
  public getTransfer = (
    input: GetTransferInput,
  ): Effect.Effect<Transfer, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const transferId = yield* requireStringEffect(input?.transferId, 'transferId');
      const path = `${this.basePath}/transfer/${encodeURIComponent(transferId)}`;
      return yield* requestGetEffect<Transfer>(this.client, path, undefined, {
        baseURL: this.financesBaseUrl,
      });
    });

  /**
   * Retrieves per-order earnings breakdowns (net earnings, fees, taxes) for the seller's orders.
   *
   * @param input - Optional orderCreationDate filter, sort, and pagination controls.
   * @returns An Effect that succeeds with the paged order earnings collection.
   *
   * @example
   * ```ts
   * const earnings = await Effect.runPromise(
   *   financesApi.getOrderEarnings({
   *     filter: 'orderCreationDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]',
   *   }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/order_earnings/methods/getOrderEarnings
   */
  public getOrderEarnings = (
    input: GetOrderEarningsInput = {},
  ): Effect.Effect<OrderEarnings, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const rawFilter = yield* optionalStringEffect(input.filter, 'filter');
      const filter = yield* validateFilterKeysEffect(rawFilter, orderEarningsFilterKeys);
      const sort = yield* optionalStringEffect(input.sort, 'sort');
      const limit = yield* optionalPositiveNumberEffect(input.limit, 'limit');
      const offset = yield* optionalNonNegativeNumberEffect(input.offset, 'offset');
      const path = `${this.basePath}/order_earnings`;
      const params = buildEndpointParams({
        filter: { wireName: 'filter', value: filter },
        sort: { wireName: 'sort', value: sort },
        limit: { wireName: 'limit', value: limit === undefined ? undefined : String(limit) },
        offset: { wireName: 'offset', value: offset === undefined ? undefined : String(offset) },
      });
      return yield* requestGetEffect<OrderEarnings>(this.client, path, params, {
        baseURL: this.financesBaseUrl,
      });
    });

  /**
   * Retrieves the earnings breakdown for a single order.
   *
   * @param input - Identifier of the order to retrieve earnings for.
   * @returns An Effect that succeeds with the order earnings detail.
   *
   * @example
   * ```ts
   * const earning = await Effect.runPromise(
   *   financesApi.getOrderEarningsById({ orderId: '12-34567-89012' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/order_earnings/methods/getOrderEarningsById
   */
  public getOrderEarningsById = (
    input: GetOrderEarningsByIdInput,
  ): Effect.Effect<OrderEarning, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const orderId = yield* requireStringEffect(input?.orderId, 'orderId');
      const path = `${this.basePath}/order_earnings/${encodeURIComponent(orderId)}`;
      return yield* requestGetEffect<OrderEarning>(this.client, path, undefined, {
        baseURL: this.financesBaseUrl,
      });
    });

  /**
   * Retrieves aggregate earnings totals across the seller's orders matching a filter.
   *
   * @param input - Optional orderCreationDate filter restricting the summarized orders.
   * @returns An Effect that succeeds with the order earnings summary.
   *
   * @example
   * ```ts
   * const summary = await Effect.runPromise(
   *   financesApi.getOrderEarningsSummary({
   *     filter: 'orderCreationDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]',
   *   }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/order_earnings_summary/methods/getOrderEarningsSummary
   */
  public getOrderEarningsSummary = (
    input: GetOrderEarningsSummaryInput = {},
  ): Effect.Effect<OrderEarningsSummary, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const rawFilter = yield* optionalStringEffect(input.filter, 'filter');
      const filter = yield* validateFilterKeysEffect(rawFilter, orderEarningsFilterKeys);
      const path = `${this.basePath}/order_earnings_summary`;
      const params = buildEndpointParams({
        filter: { wireName: 'filter', value: filter },
      });
      return yield* requestGetEffect<OrderEarningsSummary>(this.client, path, params, {
        baseURL: this.financesBaseUrl,
      });
    });

  /**
   * Retrieves the seller's billing activity line items (fees, credits, and other non-sale charges).
   *
   * @param input - Optional filter, sort, and pagination controls; eBay expects exactly one
   * of a transactionDate range, orderId, listingId, or billingCycleId filter value.
   * @returns An Effect that succeeds with the paged billing activity collection.
   *
   * @example
   * ```ts
   * const activity = await Effect.runPromise(
   *   financesApi.getBillingActivities({
   *     filter: 'transactionDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]',
   *   }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/sell/finances/resources/billing_activity/methods/getBillingActivities
   */
  public getBillingActivities = (
    input: GetBillingActivitiesInput,
  ): Effect.Effect<BillingActivityResponse, EbayApiError | EndpointInputError> =>
    Effect.gen(this, function* () {
      const rawFilter = yield* optionalStringEffect(input?.filter, 'filter');
      const filter = yield* validateFilterKeysEffect(rawFilter, billingFilterKeys, undefined, 1);
      const sort = yield* optionalStringEffect(input.sort, 'sort');
      const limit = yield* optionalPositiveNumberEffect(input.limit, 'limit');
      const offset = yield* optionalNonNegativeNumberEffect(input.offset, 'offset');
      const path = `${this.basePath}/billing_activity`;
      const params = buildEndpointParams({
        filter: { wireName: 'filter', value: filter },
        sort: { wireName: 'sort', value: sort },
        limit: { wireName: 'limit', value: limit === undefined ? undefined : String(limit) },
        offset: { wireName: 'offset', value: offset === undefined ? undefined : String(offset) },
      });
      return yield* requestGetEffect<BillingActivityResponse>(this.client, path, params, {
        baseURL: this.billingBaseUrl,
      });
    });
}
