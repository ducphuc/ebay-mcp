---
"ebay-mcp": patch
---

Pass eBay API errors through tool failures instead of a generic message.

Explicitly send the configured locale as `Accept-Language` so Node's native fetch transport cannot inject the eBay Inventory-incompatible wildcard value `*`.

Endpoint Effects previously wrapped client failures in a message-less `EbayApiError`, so failing tools (including the canonical Sell Inventory reads such as `ebay_get_inventory_item` and `ebay_get_offer`) surfaced only `{"error": "An error has occurred"}`. `EbayApiError` now carries the underlying message, HTTP status, client failure kind, and the raw eBay `errors` array recovered from the response body, and tool failure results emit that structured detail (`error`, `method`, `path`, `status`, `kind`, `ebayErrors`). Input validation failures report the offending parameter. Trading, Media, and Identity failure paths preserve their messages through the same channel.
