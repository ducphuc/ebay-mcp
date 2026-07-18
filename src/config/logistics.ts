/** Countries currently supported by eBay's Limited Release Logistics API. */
export const LOGISTICS_SUPPORTED_COUNTRY_CODES = ['US'] satisfies [string, ...string[]];

/** OAuth scope required by every eBay Logistics API operation. */
export const LOGISTICS_OAUTH_SCOPE = 'https://api.ebay.com/oauth/api_scope/sell.logistics' as const;
