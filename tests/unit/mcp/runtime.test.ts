import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import { getToolDefinitions } from '@/tools/index.js';

const mcpMock = vi.hoisted(() => ({
  close: vi.fn(),
  connect: vi.fn(),
  constructor: vi.fn(),
  registerTool: vi.fn(() => ({ update: vi.fn() })),
  registerResource: vi.fn(),
  getClientCapabilities: vi.fn(() => ({})),
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn(function (this: unknown, config) {
    mcpMock.constructor(config);
    // Mirror the McpServer surface the UI bridge touches: `registerResource` for
    // `ui://` views and the underlying `.server` for the capability gate.
    return {
      close: mcpMock.close,
      connect: mcpMock.connect,
      registerTool: mcpMock.registerTool,
      registerResource: mcpMock.registerResource,
      server: {
        oninitialized: undefined,
        getClientCapabilities: mcpMock.getClientCapabilities,
      },
    };
  }),
}));

describe('MCP runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mcpMock.registerTool.mockImplementation(() => ({ update: vi.fn() }));
  });

  it('registers the shared tool registry on server construction', async () => {
    const { createEbayMcpRuntime } = await import('@/mcp/runtime.js');
    const api = {
      initialize: vi.fn(() => Effect.succeed(undefined)),
    };

    const runtime = createEbayMcpRuntime({
      api: api as never,
      serverConfig: { name: 'test-mcp', version: '0.0.0' },
    });

    expect(runtime.api).toBe(api);
    expect(mcpMock.constructor).toHaveBeenCalledWith({ name: 'test-mcp', version: '0.0.0' });
    expect(mcpMock.registerTool).toHaveBeenCalledTimes(getToolDefinitions().length);

    await runtime.initializeApi();
    expect(api.initialize).toHaveBeenCalledOnce();
  });

  it('forwards annotations and non-UI metadata but only executable output schemas', async () => {
    const { createEbayMcpRuntime } = await import('@/mcp/runtime.js');
    createEbayMcpRuntime({
      api: { initialize: vi.fn(() => Effect.succeed(undefined)) } as never,
      serverConfig: { name: 'test-mcp', version: '0.0.0' },
    });

    const mediaCall = mcpMock.registerTool.mock.calls.find(
      ([name]) => name === 'ebay_media_get_image',
    );
    const legacyCall = mcpMock.registerTool.mock.calls.find(([name]) => name === 'search');

    expect(mediaCall?.[1]).toMatchObject({
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      outputSchema: expect.any(Object),
    });
    expect(legacyCall?.[1]).toMatchObject({
      title: 'Search',
      _meta: { category: 'chat', version: '1.0.0' },
    });
    expect(legacyCall?.[1].outputSchema).toBeUndefined();
  });

  it('retains text output and emits the raw Media result as structuredContent', async () => {
    const { createEbayMcpRuntime } = await import('@/mcp/runtime.js');
    const result = { imageId: 'IMAGE-1', imageUrl: 'https://i.ebayimg.com/image.jpg' };
    createEbayMcpRuntime({
      api: {
        initialize: vi.fn(() => Effect.succeed(undefined)),
        media: { getImage: vi.fn(() => Effect.succeed(result)) },
      } as never,
      serverConfig: { name: 'test-mcp', version: '0.0.0' },
    });
    const mediaCall = mcpMock.registerTool.mock.calls.find(
      ([name]) => name === 'ebay_media_get_image',
    );
    const callback = mediaCall?.[2];

    const response = await callback?.({ imageId: 'IMAGE-1' });

    expect(response).toMatchObject({
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    });
  });

  it('serializes an undefined successful result as valid MCP text content', async () => {
    const { createEbayMcpRuntime } = await import('@/mcp/runtime.js');
    createEbayMcpRuntime({
      api: {
        initialize: vi.fn(() => Effect.succeed(undefined)),
        finances: { getTransactions: vi.fn(() => Effect.succeed(undefined)) },
      } as never,
      serverConfig: { name: 'test-mcp', version: '0.0.0' },
    });
    const transactionCall = mcpMock.registerTool.mock.calls.find(
      ([name]) => name === 'ebay_finances_get_transactions',
    );
    const callback = transactionCall?.[2];

    const response = await callback?.({ filter: 'transactionType:{TRANSFER}' });

    expect(response).toEqual({ content: [{ type: 'text', text: 'null' }] });
  });

  it('passes the eBay API error through tool failures instead of a generic message', async () => {
    const { createEbayMcpRuntime } = await import('@/mcp/runtime.js');
    const { EbayApiError } = await import('@/api/shared/request.js');
    const ebayErrors = [
      {
        errorId: 25710,
        domain: 'API_INVENTORY',
        message: 'Resource not found.',
        longMessage: 'The SKU value MISSING-SKU was not found.',
      },
    ];
    const endpointFailure = new EbayApiError({
      method: 'GET',
      path: '/sell/inventory/v1/inventory_item/MISSING-SKU',
      message: 'eBay API Error: The SKU value MISSING-SKU was not found.',
      status: 404,
      kind: 'httpStatus',
      ebayErrors,
      cause: undefined,
    });
    createEbayMcpRuntime({
      api: {
        initialize: vi.fn(() => Effect.succeed(undefined)),
        inventory: { getInventoryItem: vi.fn(() => Effect.fail(endpointFailure)) },
      } as never,
      serverConfig: { name: 'test-mcp', version: '0.0.0' },
    });
    const inventoryCall = mcpMock.registerTool.mock.calls.find(
      ([name]) => name === 'ebay_get_inventory_item',
    );
    const callback = inventoryCall?.[2];

    const response = await callback?.({ sku: 'MISSING-SKU' });

    expect(response?.isError).toBe(true);
    const payload = JSON.parse(response?.content?.[0]?.text ?? '{}');
    expect(payload).toEqual({
      error: 'eBay API Error: The SKU value MISSING-SKU was not found.',
      method: 'GET',
      path: '/sell/inventory/v1/inventory_item/MISSING-SKU',
      status: 404,
      kind: 'httpStatus',
      ebayErrors,
    });
    expect(payload.error).not.toBe('An error has occurred');
  });

  it('reports validation failures with the offending parameter', async () => {
    const { createEbayMcpRuntime } = await import('@/mcp/runtime.js');
    const { EndpointInputError } = await import('@/api/shared/request.js');
    createEbayMcpRuntime({
      api: {
        initialize: vi.fn(() => Effect.succeed(undefined)),
        inventory: {
          getInventoryItem: vi.fn(() =>
            Effect.fail(
              new EndpointInputError({
                parameter: 'sku',
                message: 'sku is required and must be a string',
              }),
            ),
          ),
        },
      } as never,
      serverConfig: { name: 'test-mcp', version: '0.0.0' },
    });
    const inventoryCall = mcpMock.registerTool.mock.calls.find(
      ([name]) => name === 'ebay_get_inventory_item',
    );
    const callback = inventoryCall?.[2];

    const response = await callback?.({ sku: 'PRESENT-BUT-REJECTED' });

    expect(response?.isError).toBe(true);
    expect(JSON.parse(response?.content?.[0]?.text ?? '{}')).toEqual({
      error: 'sku is required and must be a string',
      parameter: 'sku',
    });
  });
});
