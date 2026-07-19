# Media and Logistics Contracts

This document describes the Media and Logistics tools that the current ebay-mcp registry actually exposes. It is intentionally narrower than the checked-in OpenAPI specifications: a specification operation is not callable unless it has a registered MCP tool.

Source tool names below use the `ebay_*` contract. MCP hosts may display an additional server namespace.

## Tool gating

Both families are valid `EBAY_MCP_TOOLS` values:

```bash
EBAY_MCP_TOOLS=media,logistics
```

Exposing a family only registers its tools. It does not configure the Media upload root, obtain eBay application approval, or add OAuth permissions.

## Commerce Media

The current registry exposes three EPS image tools:

| Tool | Input | Successful MCP result |
| --- | --- | --- |
| `ebay_media_create_image_from_file` | `filePath`; optional `fileName`, `mimeType` assertion | Executable image contract with fields such as `imageId`, `imageUrl`, `maxDimensionImageUrl`, `location`, and `expirationDate` |
| `ebay_media_create_image_from_url` | Public absolute HTTPS `imageUrl` | Same executable image contract |
| `ebay_media_get_image` | EPS `imageId` | Same executable image contract |

All three require the standard `sell.inventory` OAuth permission. The broader cached Media specification contains video and document operations, but they are not registered tools in this version.

### Secure local-file staging

Local upload remains unavailable until `EBAY_MCP_MEDIA_ROOT` is set to an absolute directory:

```bash
EBAY_MCP_MEDIA_ROOT=/absolute/path/to/ebay-images
```

For `ebay_media_create_image_from_file`, ebay-mcp:

- resolves the configured root and requested file to canonical paths and rejects escapes, including symlink escapes;
- accepts only regular readable files beneath the configured root;
- detects the content signature instead of trusting the extension or caller-supplied MIME type;
- accepts JPEG, PNG, GIF, BMP, TIFF, WEBP, AVIF, and HEIC images;
- rejects images larger than 12 MiB; and
- treats optional `mimeType` as an assertion that must match detected content.

URL upload accepts only an absolute `https:` URL with a host. The URL must be publicly reachable by eBay.

### Safe Media sequence

1. Stage and order the intended files beneath `EBAY_MCP_MEDIA_ROOT`.
2. Validate their formats and sizes before upload.
3. Upload the approved image set.
4. Persist the returned EPS image ID and URL.
5. Use `ebay_media_get_image` for verification when useful, then supply the persisted URLs to the Inventory API in the intended display order.

Media POSTs do not automatically retry 5xx failures. An upload is non-idempotent: after an ambiguous timeout or server error, inspect any returned/known EPS state before manually repeating it. Do not assume a failed client response means eBay did not create the image.

## Sell Logistics

The current registry exposes six Limited Release tools for the `/sell/logistics/v1_beta` domestic-US USPS flow:

| Tool | Input | Successful MCP result |
| --- | --- | --- |
| `ebay_logistics_create_shipping_quote` | `shippingQuoteRequest`; optional `marketplaceId` | eBay response returned as JSON text |
| `ebay_logistics_get_shipping_quote` | `shippingQuoteId` | eBay response returned as JSON text |
| `ebay_logistics_create_from_shipping_quote` | `createShipmentFromQuoteRequest`; optional `marketplaceId` | eBay response returned as JSON text |
| `ebay_logistics_get_shipment` | `shipmentId` | eBay response returned as JSON text |
| `ebay_logistics_cancel_shipment` | `shipmentId` | eBay response returned as JSON text |
| `ebay_logistics_download_label_file` | `shipmentId`; optional `accept` fixed to `application/pdf` | Executable contract containing `shipmentId`, `contentType`, `encoding`, base64 `data`, and `sizeBytes` |

Quote requests contain one to ten eBay orders, package dimensions and weight, and full US ship-from/ship-to contacts. Purchase requests identify the selected `shippingQuoteId` and `rateId`, with optional label message, 4-by-6 label size, return contact, and additional options. Label download is PDF-only; decode the base64 payload before writing the label file.

### Approval and OAuth gates

Logistics requires both:

1. eBay approval for the Limited Release API; and
2. a token created with the opt-in `https://api.ebay.com/oauth/api_scope/sell.logistics` permission.

The restricted permission is not part of normal defaults. After eBay approves the application, request it explicitly with:

```bash
npm run setup -- --logistics
```

Diagnostics warn when Logistics tools are exposed but the current token lacks `sell.logistics`.

### Safe quote-to-label sequence

1. Call `ebay_logistics_create_shipping_quote`.
2. Read the quote with `ebay_logistics_get_shipping_quote` and select a rate.
3. Obtain explicit operator approval before purchasing a label.
4. Call `ebay_logistics_create_from_shipping_quote` once.
5. Read the shipment with `ebay_logistics_get_shipment`.
6. Download the PDF with `ebay_logistics_download_label_file` and persist its decoded bytes.

Quote creation, label purchase, and cancellation do not automatically retry 5xx failures. After an ambiguous result, read back the quote or shipment before deciding whether a manual retry is safe. Never blindly repeat label purchase or cancellation; both can have financial or operational consequences.

## Logistics is not eDelivery

`ebay_edelivery_*` is the separate eDelivery International Shipping API at `/sell/edelivery_international_shipping/v1`, intended for eligible Greater-China-based sellers shipping internationally. It is not an alias or fallback for `ebay_logistics_*` and must not be used for domestic-US label workflows.

The registry exposes 27 `ebay_edelivery_*` tools. Twenty-two response-bearing tools advertise executable output contracts; the four 204 No Content operations and `ebay_edelivery_create_complaint` intentionally remain text-only because eBay defines no useful response body for them.
