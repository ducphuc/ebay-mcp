import type { EbayApiClient } from '@/api/client.js';
import { FinancesApi } from '@/api/finances/finances.js';
import { EndpointInputError } from '@/api/shared/request.js';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('FinancesApi', () => {
  let client: EbayApiClient;
  let api: FinancesApi;

  beforeEach(() => {
    client = {
      get: vi.fn(),
    } as unknown as EbayApiClient;
    api = new FinancesApi(client);
  });

  it('retrieves transactions with filter, sort, and pagination wire params', async () => {
    vi.mocked(client.get).mockResolvedValue({ transactions: [] });

    await Effect.runPromise(
      api.getTransactions({
        filter: 'transactionType:{SALE}',
        sort: 'transactionDate',
        limit: 50,
        offset: 10,
      }),
    );

    expect(client.get).toHaveBeenCalledWith(
      '/sell/finances/v1/transaction',
      { filter: 'transactionType:{SALE}', sort: 'transactionDate', limit: '50', offset: '10' },
      { baseURL: 'https://apiz.ebay.com' },
    );
  });

  it('omits query params entirely when no transaction filters are provided', async () => {
    vi.mocked(client.get).mockResolvedValue({ transactions: [] });

    await Effect.runPromise(api.getTransactions());

    expect(client.get).toHaveBeenCalledWith('/sell/finances/v1/transaction', undefined, {
      baseURL: 'https://apiz.ebay.com',
    });
  });

  it('retrieves the transaction summary with an optional filter', async () => {
    vi.mocked(client.get).mockResolvedValue({ creditCount: 2 });

    await Effect.runPromise(api.getTransactionSummary({ filter: 'transactionStatus:{PAYOUT}' }));

    expect(client.get).toHaveBeenCalledWith(
      '/sell/finances/v1/transaction_summary',
      { filter: 'transactionStatus:{PAYOUT}' },
      { baseURL: 'https://apiz.ebay.com' },
    );
  });

  it('retrieves payouts with filter, sort, and pagination wire params', async () => {
    vi.mocked(client.get).mockResolvedValue({ payouts: [] });

    await Effect.runPromise(
      api.getPayouts({
        filter: 'payoutStatus:{SUCCEEDED}',
        sort: 'payoutDate',
        limit: 20,
        offset: 0,
      }),
    );

    expect(client.get).toHaveBeenCalledWith(
      '/sell/finances/v1/payout',
      { filter: 'payoutStatus:{SUCCEEDED}', sort: 'payoutDate', limit: '20', offset: '0' },
      { baseURL: 'https://apiz.ebay.com' },
    );
  });

  it('retrieves a payout by ID with the path segment URL-encoded', async () => {
    vi.mocked(client.get).mockResolvedValue({ payoutId: 'PAYOUT/1' });

    await Effect.runPromise(api.getPayout({ payoutId: 'PAYOUT/1' }));

    expect(client.get).toHaveBeenCalledWith('/sell/finances/v1/payout/PAYOUT%2F1', undefined, {
      baseURL: 'https://apiz.ebay.com',
    });
  });

  it('retrieves the payout summary with an optional filter', async () => {
    vi.mocked(client.get).mockResolvedValue({ amount: {} });

    await Effect.runPromise(api.getPayoutSummary({ filter: 'payoutStatus:{SUCCEEDED}' }));

    expect(client.get).toHaveBeenCalledWith(
      '/sell/finances/v1/payout_summary',
      { filter: 'payoutStatus:{SUCCEEDED}' },
      { baseURL: 'https://apiz.ebay.com' },
    );
  });

  it('retrieves the seller funds summary without params', async () => {
    vi.mocked(client.get).mockResolvedValue({ totalFunds: {} });

    await Effect.runPromise(api.getSellerFundsSummary());

    expect(client.get).toHaveBeenCalledWith('/sell/finances/v1/seller_funds_summary', undefined, {
      baseURL: 'https://apiz.ebay.com',
    });
  });

  it('retrieves a transfer by ID with the path segment URL-encoded', async () => {
    vi.mocked(client.get).mockResolvedValue({ transferId: 'TRANSFER/9' });

    await Effect.runPromise(api.getTransfer({ transferId: 'TRANSFER/9' }));

    expect(client.get).toHaveBeenCalledWith('/sell/finances/v1/transfer/TRANSFER%2F9', undefined, {
      baseURL: 'https://apiz.ebay.com',
    });
  });

  it('retrieves order earnings with filter, sort, and pagination wire params', async () => {
    vi.mocked(client.get).mockResolvedValue({ orderEarnings: [] });

    await Effect.runPromise(
      api.getOrderEarnings({
        filter: 'orderCreationDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]',
        sort: 'orderCreationDate',
        limit: 25,
        offset: 5,
      }),
    );

    expect(client.get).toHaveBeenCalledWith(
      '/sell/finances/v1/order_earnings',
      {
        filter: 'orderCreationDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]',
        sort: 'orderCreationDate',
        limit: '25',
        offset: '5',
      },
      { baseURL: 'https://apiz.ebay.com' },
    );
  });

  it('retrieves order earnings for a single order with the path segment URL-encoded', async () => {
    vi.mocked(client.get).mockResolvedValue({ orderId: '12-34567/89012' });

    await Effect.runPromise(api.getOrderEarningsById({ orderId: '12-34567/89012' }));

    expect(client.get).toHaveBeenCalledWith(
      '/sell/finances/v1/order_earnings/12-34567%2F89012',
      undefined,
      { baseURL: 'https://apiz.ebay.com' },
    );
  });

  it('retrieves the order earnings summary with an optional filter', async () => {
    vi.mocked(client.get).mockResolvedValue({ totalNetEarnings: {} });

    await Effect.runPromise(
      api.getOrderEarningsSummary({
        filter: 'orderCreationDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]',
      }),
    );

    expect(client.get).toHaveBeenCalledWith(
      '/sell/finances/v1/order_earnings_summary',
      { filter: 'orderCreationDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]' },
      { baseURL: 'https://apiz.ebay.com' },
    );
  });

  it('retrieves billing activities with filter, sort, and pagination wire params', async () => {
    vi.mocked(client.get).mockResolvedValue({ billingActivity: [] });

    await Effect.runPromise(
      api.getBillingActivities({
        filter: 'transactionDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]',
        sort: 'transactionDate',
        limit: 100,
        offset: 0,
      }),
    );

    expect(client.get).toHaveBeenCalledWith(
      '/sell/finances/v1/billing_activity',
      {
        filter: 'transactionDate:[2026-01-01T00:00:01.000Z..2026-01-31T00:00:01.000Z]',
        sort: 'transactionDate',
        limit: '100',
        offset: '0',
      },
      { baseURL: 'https://api.ebay.com' },
    );
  });

  it('fails with a tagged input error when orderId is missing', async () => {
    const result = await Effect.runPromise(
      Effect.either(api.getOrderEarningsById({ orderId: undefined as unknown as string })),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(EndpointInputError);
    }
    expect(client.get).not.toHaveBeenCalled();
  });

  it('targets the sandbox host when constructed for the sandbox environment', async () => {
    api = new FinancesApi(client, 'sandbox');
    vi.mocked(client.get).mockResolvedValue({ transactions: [] });

    await Effect.runPromise(api.getTransactions());

    expect(client.get).toHaveBeenCalledWith('/sell/finances/v1/transaction', undefined, {
      baseURL: 'https://apiz.sandbox.ebay.com',
    });
  });

  it('lets a configured base URL override win verbatim over the environment host', async () => {
    api = new FinancesApi(client, 'production', 'https://proxy.internal');
    vi.mocked(client.get).mockResolvedValue({ totalFunds: {} });

    await Effect.runPromise(api.getSellerFundsSummary());

    expect(client.get).toHaveBeenCalledWith('/sell/finances/v1/seller_funds_summary', undefined, {
      baseURL: 'https://proxy.internal',
    });
  });

  it('fails with a tagged input error when payoutId is missing', async () => {
    const result = await Effect.runPromise(
      Effect.either(api.getPayout({ payoutId: undefined as unknown as string })),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(EndpointInputError);
    }
    expect(client.get).not.toHaveBeenCalled();
  });

  it('fails with a tagged input error when transferId is missing', async () => {
    const result = await Effect.runPromise(
      Effect.either(api.getTransfer({ transferId: undefined as unknown as string })),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(EndpointInputError);
    }
    expect(client.get).not.toHaveBeenCalled();
  });
});
