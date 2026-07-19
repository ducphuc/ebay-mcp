---
"ebay-mcp": minor
---

Add Commerce Media and Limited Release Logistics tools with secure opt-in configuration, executable MCP structured output contracts, and safer request retry behavior.

Local file uploads now require an absolute `EBAY_MCP_MEDIA_ROOT`, enforce canonical containment, validate image signatures, and cap files at 12 MiB. Logistics OAuth remains opt-in through `npm run setup -- --logistics`.

Correct the Logistics label contract to PDF-only. Removing the previously advertised `image/png` label option is a breaking contract correction matching eBay's API specification.

The port preserves the established `ebay_edelivery_*` public tool names for the eDelivery International Shipping family, keeping them distinct from the separate `ebay_logistics_*` tools. The 22 eDelivery tools that return response bodies now advertise executable MCP output contracts (spec-accurate envelopes with passthrough for undocumented fields) and emit `structuredContent`; the four 204 No Content operations and `createComplaint` intentionally remain text-only because eBay defines no response shape for them.
