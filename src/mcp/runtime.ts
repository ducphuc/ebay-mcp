import { McpServer, type RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { EbaySellerApi } from '@/api/index.js';
import { getEbayConfig, mcpConfig } from '@/config/environment.js';
import { resolveToolGatingMode } from '@/config/toolFamilies.js';
import {
  createToolGatingController,
  DYNAMIC_MODE_INSTRUCTIONS,
  registerMetaTools,
  toolNamesInFamilies,
} from '@/mcp/toolGating.js';
import { buildUiToolResult, createUiBridge, type UiBridge } from '@/mcp/uiBridge.js';
import { EbayApiError, EndpointInputError } from '@/api/shared/request.js';
import { getToolEntries, type ToolEntry } from '@/tools/registry.js';
import { serverLogger, toolLogger } from '@/utils/logger.js';
import { Cause, Effect, Runtime } from 'effect';

type ToolArgs = Record<string, unknown>;

/**
 * Optional dependencies and metadata for constructing the eBay MCP runtime.
 */
export interface EbayMcpRuntimeOptions {
  /** Optional prebuilt API facade, mainly for tests. */
  api?: EbaySellerApi;
  /** Optional MCP implementation metadata advertised during initialize. */
  serverConfig?: Implementation;
  /** Enables debug/error logs for each tool call when true. */
  logToolExecution?: boolean;
}

/**
 * Initialized MCP server runtime and eBay API facade.
 */
export interface EbayMcpRuntime {
  /** eBay API facade shared by every registered tool handler. */
  api: EbaySellerApi;
  /** MCP server instance with eBay tools registered. */
  server: McpServer;
  /** Initializes credentials/token state before the server accepts real calls. */
  initializeApi(): Promise<void>;
}

function formatToolSuccess(result: unknown, includeStructuredContent: boolean) {
  const serializableResult = result === undefined ? null : result;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(serializableResult, null, 2),
      },
    ],
    ...(includeStructuredContent && serializableResult !== null
      ? { structuredContent: serializableResult as Record<string, unknown> }
      : {}),
  };
}

/**
 * Recover the typed failure value from a handler rejection.
 *
 * Tool handlers run endpoint Effects with `Effect.runPromise`, so rejections
 * arrive as `FiberFailure` wrappers whose `.message` degrades to a generic
 * string for tagged errors. Squashing the underlying cause restores the
 * original failure (or first defect) so its eBay error detail can be surfaced.
 */
function unwrapToolFailure(error: unknown): unknown {
  return Runtime.isFiberFailure(error) ? Cause.squash(error[Runtime.FiberFailureCauseId]) : error;
}

/** Stringify an arbitrary thrown value without collapsing it to "Unknown error". */
function describeUnknownFailure(failure: unknown): string {
  if (failure instanceof Error) {
    return failure.message === '' ? String(failure) : failure.message;
  }

  if (typeof failure === 'string') {
    return failure;
  }

  try {
    return JSON.stringify(failure) ?? String(failure);
  } catch {
    return String(failure);
  }
}

/**
 * Build the failure payload for a tool result, passing the eBay API error
 * through instead of a generic message: message, HTTP status, request method
 * and path, and the raw eBay `errors` array when the response carried one.
 */
function toolFailurePayload(error: unknown): Record<string, unknown> {
  const failure = unwrapToolFailure(error);

  if (failure instanceof EbayApiError) {
    return {
      error: failure.message,
      method: failure.method,
      path: failure.path,
      ...(failure.status === undefined ? {} : { status: failure.status }),
      ...(failure.kind === undefined ? {} : { kind: failure.kind }),
      ...(failure.ebayErrors === undefined ? {} : { ebayErrors: failure.ebayErrors }),
    };
  }

  if (failure instanceof EndpointInputError) {
    return {
      error: failure.message,
      parameter: failure.parameter,
    };
  }

  return { error: describeUnknownFailure(failure) };
}

function formatToolFailure(error: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(toolFailurePayload(error), null, 2),
      },
    ],
    isError: true,
  };
}

const getNonUiMeta = (
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!meta) return undefined;
  const { ui: _ui, ...nonUiMeta } = meta;
  return Object.keys(nonUiMeta).length > 0 ? nonUiMeta : undefined;
};

function registerTool(
  server: McpServer,
  api: EbaySellerApi,
  entry: ToolEntry,
  logToolExecution: boolean,
  ui: UiBridge,
): RegisteredTool {
  const { definition, handler } = entry;

  // Registered plainly (no UI `_meta`) so every host gets a working text tool by
  // default; the capability gate later flips `_meta.ui` on for UI-capable clients.
  const registered = server.registerTool(
    definition.name,
    {
      title: definition.title,
      description: definition.description,
      inputSchema: definition.inputSchema,
      // Legacy definition.outputSchema values are JSON metadata, not executable
      // Zod schemas. Only the explicitly executable wire schema reaches the SDK.
      outputSchema: entry.wireOutputSchema,
      annotations: definition.annotations,
      _meta: getNonUiMeta(definition._meta),
    },
    async (args: ToolArgs) => {
      if (logToolExecution) {
        toolLogger.debug(`Executing tool: ${definition.name}`, { args });
      }

      return await Effect.runPromise(
        Effect.tryPromise({
          try: () => Promise.resolve(handler(api, args)),
          catch: (error) => error,
        }).pipe(
          Effect.map((result) => {
            if (logToolExecution) {
              toolLogger.debug(`Tool ${definition.name} completed successfully`);
            }

            return ui.shouldRender(entry)
              ? buildUiToolResult(entry.ui, result)
              : formatToolSuccess(result, entry.wireOutputSchema !== undefined);
          }),
          Effect.catchAll((error) => {
            if (logToolExecution) {
              toolLogger.error(`Tool ${definition.name} failed`, {
                error: describeUnknownFailure(unwrapToolFailure(error)),
              });
            }

            return Effect.succeed(formatToolFailure(error));
          }),
        ),
      );
    },
  );

  ui.register(entry, registered);
  return registered;
}

/**
 * Create an MCP server runtime and register all eBay tool handlers.
 *
 * @param options - Optional runtime dependencies and metadata overrides.
 * @returns Initialized runtime wrapper containing the MCP server and API facade.
 *
 * @example
 * ```ts
 * const runtime = createEbayMcpRuntime({ logToolExecution: true });
 * await runtime.initializeApi();
 * ```
 */
export const createEbayMcpRuntime = (options: EbayMcpRuntimeOptions = {}): EbayMcpRuntime => {
  const api = options.api ?? new EbaySellerApi(getEbayConfig());
  const serverInfo = options.serverConfig ?? mcpConfig;
  const mode = resolveToolGatingMode();

  // Instructions are set only in dynamic mode so the agent knows the catalogue is
  // hidden behind the discovery tools; default/static modes keep the handshake
  // byte-for-byte unchanged (a bare single-arg construction).
  const server =
    mode.kind === 'dynamic'
      ? new McpServer(serverInfo, { instructions: DYNAMIC_MODE_INSTRUCTIONS })
      : new McpServer(serverInfo);

  const ui = createUiBridge(server, import.meta.url);

  // Static mode registers only the named families; all and dynamic register the
  // full catalogue (dynamic then disables it below, before the transport connects).
  const allEntries = getToolEntries();
  const entries =
    mode.kind === 'static'
      ? (() => {
          const names = toolNamesInFamilies(mode.families);
          return allEntries.filter((entry) => names.has(entry.definition.name));
        })()
      : allEntries;

  const handles = new Map<string, RegisteredTool>();
  for (const entry of entries) {
    handles.set(
      entry.definition.name,
      registerTool(server, api, entry, options.logToolExecution ?? false, ui),
    );
  }

  if (mode.kind === 'dynamic') {
    // Disable before `connect`: the SDK only emits `tools/listChanged` once the
    // transport is connected, so these flips are silent. The agent re-enables the
    // tools it needs via the meta-tools, which fire `listChanged` post-connect.
    for (const handle of handles.values()) {
      handle.disable();
    }
    registerMetaTools(server, createToolGatingController(handles));
    serverLogger.info(
      `Dynamic tool mode: ${handles.size} eBay tools hidden behind 3 discovery tools`,
    );
  } else if (mode.kind === 'static') {
    serverLogger.info(
      `Static tool mode: registered ${handles.size} tools from families: ${mode.families.join(', ')}`,
    );
  } else {
    serverLogger.info(`Registering ${handles.size} tools`);
  }

  // Install after registration so every UI-eligible tool is captured before the
  // gate can flip their metadata on a UI-capable client's `initialize`.
  ui.installCapabilityGate();

  return {
    api,
    server,
    async initializeApi() {
      await Effect.runPromise(api.initialize());
    },
  };
};
