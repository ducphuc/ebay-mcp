import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import { executeTool } from '@/tools/index.js';
import { EbaySellerApi } from '@/api/index.js';
import type { EbayConfig } from '@/types/ebay.js';
import { mockEbayApiEndpoint, cleanupMocks } from '@tests/helpers/mockHttp.js';
import process from 'node:process';
import { Effect } from 'effect';

// Mock EbayOAuthClient
const mockOAuthClient = {
  hasUserTokens: vi.fn(),
  getAccessToken: vi.fn(),
  setUserTokens: vi.fn(),
  initialize: vi.fn(),
  getTokenInfo: vi.fn(),
  isAuthenticated: vi.fn(),
};

vi.mock('../../../src/auth/oauth.js', () => ({
  EbayOAuthClient: vi.fn(function (this: unknown) {
    return mockOAuthClient;
  }),
}));

describe('Logistics Tools Integration Tests', () => {
  let api: EbaySellerApi;
  let config: EbayConfig;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    vi.clearAllMocks();
    cleanupMocks();
    nock.disableNetConnect();

    originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.EBAY_USER_REFRESH_TOKEN;
    delete process.env.EBAY_USER_ACCESS_TOKEN;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;

    config = {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      environment: 'sandbox',
      redirectUri: 'https://localhost/callback',
      marketplaceId: 'EBAY_US',
    };

    mockOAuthClient.hasUserTokens.mockReturnValue(true);
    mockOAuthClient.getAccessToken.mockReturnValue(Effect.succeed('mock_access_token'));
    mockOAuthClient.initialize.mockReturnValue(Effect.succeed(undefined));

    api = new EbaySellerApi(config);
    await Effect.runPromise(api.initialize());
  });

  afterEach(() => {
    cleanupMocks();
    nock.enableNetConnect();
    process.env = originalEnv;
  });

  describe('ebay_logistics_get_shipping_quote', () => {
    it('retrieves a shipping quote by ID', async () => {
      const mockResponse = {
        shippingQuoteId: 'QUOTE-1',
        rates: [{ rateId: 'RATE-1', totalShippingCost: { currency: 'USD', value: '7.69' } }],
      };

      mockEbayApiEndpoint(
        '/sell/logistics/v1_beta/shipping_quote/QUOTE-1',
        'get',
        'sandbox',
        mockResponse,
      );

      const result = await executeTool(api, 'ebay_logistics_get_shipping_quote', {
        shippingQuoteId: 'QUOTE-1',
      });

      expect(result.shippingQuoteId).toBe('QUOTE-1');
      expect(result.rates).toHaveLength(1);
    });
  });

  describe('ebay_logistics_create_from_shipping_quote', () => {
    it('passes the eBay insufficient-permissions detail through on a 403', async () => {
      // Mirrors the real limited-release failure mode: label purchase is the
      // one Logistics operation gated behind eBay's sell.logistics approval.
      const permissionError = {
        errors: [
          {
            errorId: 1100,
            domain: 'ACCESS',
            category: 'REQUEST',
            message: 'Access denied',
            longMessage: 'Insufficient permissions to fulfill the request.',
          },
        ],
      };

      mockEbayApiEndpoint(
        '/sell/logistics/v1_beta/shipment/create_from_shipping_quote',
        'post',
        'sandbox',
        permissionError,
        403,
      );

      await expect(
        executeTool(api, 'ebay_logistics_create_from_shipping_quote', {
          createShipmentFromQuoteRequest: { shippingQuoteId: 'QUOTE-1', rateId: 'RATE-1' },
        }),
      ).rejects.toThrow('Insufficient permissions to fulfill the request.');
    });
  });
});
