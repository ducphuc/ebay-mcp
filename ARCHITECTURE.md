# ebay-mcp Architecture

The real file map and the pipeline a tool call flows through. Orientation is in
[CONTEXT.md](CONTEXT.md); code idioms are in [CODE-STYLE.md](CODE-STYLE.md).

## Layout

```txt
src/
├── index.ts          # bin entry — routes `setup` / `skills`, else runs the MCP stdio server
├── serverHttp.ts    # HTTP transport entry point
├── api/              # eBay API area classes + clients — one subfolder per area
│                     #   (account-management, order-management, marketing-and-promotions, …)
│                     #   plus client.ts (REST) and clientTrading.ts (Trading XML)
├── auth/             # OAuth 2.0 flow, token store, JWT verification (jose)
├── config/           # environment loading, constants, toolFamilies
├── mcp/              # runtime.ts, httpTransport.ts, toolGating.ts, uiBridge.ts
├── tools/            # tool wiring: defineTool.ts, registry.ts, contracts.ts, schemas.ts,
│                     #   categories/ (15 families), legacy marketing definitions/handlers, ui/
├── schemas/          # shared Effect-backed schemas and executable MCP output contracts
├── skills/           # agent-skills generator (`ebay-mcp skills`)
├── scripts/          # CLI tooling (setup, skills, devSync, diagnostics, buildUi, …)
├── types/            # generated OpenAPI types — do NOT hand-edit (`pnpm run sync`)
└── utils/            # logging, http, errors, version, cliUi
```

## Pipeline — a tool call

```txt
src/tools/categories/<family>.ts
  → defineTool(spec)                     # Zod raw shape = SSOT for wire schema + handler args
  → marketing bridge                     # legacy: pairs definitions/marketing.ts with tool-handlers/marketing.ts
  → registry (src/tools/registry.ts)     # assembles ToolEntry[] from categories/index.ts

host call → registry.executeTool
  → handler (validates args)
  → EbaySellerApi facade                 # api.<area>.<method>
  → src/api/<area>/*.ts
  → EbayApiClient (REST)  |  TradingApiClient (XML, fast-xml-parser)
    # target: Effect-returning endpoint methods; legacy paths still use withApiError
  → eBay
  ← result  → optional MCP-Apps view model (archetype: table | card | chart)  → host
```

Tool exposure is gated by `EBAY_MCP_TOOLS` (`all` | `dynamic` | family list),
applied in `src/mcp/runtime.ts`. Both transports (`index.ts` stdio,
`serverHttp.ts`) wrap the same runtime; **stdout is reserved for the protocol**,
so logs go to stderr.

## Code style (the load-bearing rules)

Full guide: [CODE-STYLE.md](CODE-STYLE.md). In short:

| Rule | Shape |
| --- | --- |
| Imports | `@/` alias except same-dir siblings; keep NodeNext `.js` |
| Files | hand-written source/test/UI file basenames are camelCase, never kebab-case or snake_case; generated/upstream filenames keep source names |
| Casts | boundary-only; never `as any`; no hand-written source excluded from typecheck |
| Functions | new/migrated exported functions use `export const ... = (...) =>`; named exports only |
| Errors | fallible API/IO returns typed Effects; run with `Effect.runPromise` only at MCP/HTTP/CLI boundaries |
| Tools | Zod schema `.shape` is the tool input SSOT; marketing split files are a legacy bridge, not a new pattern |
| File size | Biome warns > ~300 lines/file, ~60 lines/function on logic dirs; declarative/generated/table files are warning-exempt |

Enforcement is **Biome** (`biome.json`) + `tsc`, run as `pnpm run check:ci` and
`pnpm run typecheck`. (There is no `lint:lines` script; size caps are Biome
rules.)
