---
"ebay-mcp": minor
---

Add Commerce Media and Limited Release Logistics tools with secure opt-in configuration, executable MCP structured output contracts, and safer request retry behavior.

Local file uploads now require an absolute `EBAY_MCP_MEDIA_ROOT`, enforce canonical containment, validate image signatures, and cap files at 12 MiB. Logistics OAuth remains opt-in through `npm run setup -- --logistics`.

Correct the Logistics label contract to PDF-only. Removing the previously advertised `image/png` label option is a breaking contract correction matching eBay's API specification.
