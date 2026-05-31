import type { AxiosRequestConfig } from 'axios';
import type { EbayApiClient } from '../client.js';

/**
 * Logistics API - domestic USPS quote and shipment label flow.
 * Based on: docs/sell-apps/logistics/sell_logistics_v1_oas3.json
 */
export class LogisticsApi {
  private readonly basePath = '/sell/logistics/v1_beta';

  constructor(private client: EbayApiClient) {}

  private withMarketplaceHeader(marketplaceId?: string): AxiosRequestConfig | undefined {
    if (!marketplaceId) {
      return undefined;
    }

    return {
      headers: {
        'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
      },
    };
  }

  async createShippingQuote(
    shippingQuoteRequest: Record<string, unknown>,
    marketplaceId?: string
  ) {
    return await this.client.post(
      `${this.basePath}/shipping_quote`,
      shippingQuoteRequest,
      this.withMarketplaceHeader(marketplaceId)
    );
  }

  async getShippingQuote(shippingQuoteId: string) {
    return await this.client.get(`${this.basePath}/shipping_quote/${shippingQuoteId}`);
  }

  async createFromShippingQuote(
    createShipmentFromQuoteRequest: Record<string, unknown>,
    marketplaceId?: string
  ) {
    return await this.client.post(
      `${this.basePath}/shipment/create_from_shipping_quote`,
      createShipmentFromQuoteRequest,
      this.withMarketplaceHeader(marketplaceId)
    );
  }

  async getShipment(shipmentId: string) {
    return await this.client.get(`${this.basePath}/shipment/${shipmentId}`);
  }

  async cancelShipment(shipmentId: string) {
    return await this.client.post(`${this.basePath}/shipment/${shipmentId}/cancel`, {});
  }

  async downloadLabelFile(shipmentId: string, accept = 'application/pdf') {
    return await this.client.get<ArrayBuffer>(
      `${this.basePath}/shipment/${shipmentId}/download_label_file`,
      undefined,
      {
        headers: {
          Accept: accept,
        },
        responseType: 'arraybuffer',
      }
    );
  }
}
