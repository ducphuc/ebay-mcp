import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServicesOutputSchema } from '@/schemas/other/edelivery.js';
import { z } from '@/utils/effectSchema.js';
import { afterEach, describe, expect, it } from 'vitest';

describe('SDK executable output contracts', () => {
  const closeCallbacks: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(closeCallbacks.splice(0).map((close) => close()));
  });

  const connect = async (server: McpServer): Promise<Client> => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    closeCallbacks.push(
      () => client.close(),
      () => server.close(),
    );
    return client;
  };

  it('advertises and validates conforming structuredContent', async () => {
    const server = new McpServer({ name: 'test-server', version: '0.0.0' });
    server.registerTool(
      'valid-output',
      {
        inputSchema: {},
        outputSchema: z.object({ imageId: z.string() }),
      },
      () => ({
        content: [{ type: 'text', text: '{"imageId":"IMAGE-1"}' }],
        structuredContent: { imageId: 'IMAGE-1' },
      }),
    );
    const client = await connect(server);

    const tools = await client.listTools();
    const result = await client.callTool({ name: 'valid-output', arguments: {} });

    expect(tools.tools[0]?.outputSchema).toMatchObject({ type: 'object' });
    expect(result).toMatchObject({
      content: [{ type: 'text', text: '{"imageId":"IMAGE-1"}' }],
      structuredContent: { imageId: 'IMAGE-1' },
    });
  });

  it('serves eDelivery responses with undocumented fields through the wire contract', async () => {
    const response = {
      serviceList: {
        total: 1,
        services: [{ shippingServiceId: 'SVC-1', nameEn: 'SpeedPAK', undocumentedField: 'kept' }],
      },
    };
    const server = new McpServer({ name: 'test-server', version: '0.0.0' });
    server.registerTool(
      'edelivery-get-services',
      {
        inputSchema: {},
        outputSchema: getServicesOutputSchema,
      },
      () => ({
        content: [{ type: 'text', text: JSON.stringify(response) }],
        structuredContent: response,
      }),
    );
    const client = await connect(server);

    const tools = await client.listTools();
    const result = await client.callTool({ name: 'edelivery-get-services', arguments: {} });

    expect(tools.tools[0]?.outputSchema).toMatchObject({
      type: 'object',
      properties: { serviceList: expect.objectContaining({ type: 'object' }) },
    });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(response);
  });

  it('rejects malformed handler structuredContent', async () => {
    const server = new McpServer({ name: 'test-server', version: '0.0.0' });
    server.registerTool(
      'invalid-output',
      {
        inputSchema: {},
        outputSchema: z.object({ imageId: z.string() }),
      },
      () => ({
        content: [{ type: 'text', text: '{}' }],
        structuredContent: {},
      }),
    );
    const client = await connect(server);

    const result = await client.callTool({ name: 'invalid-output', arguments: {} });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringMatching(/Output validation error/),
      }),
    ]);
  });
});
