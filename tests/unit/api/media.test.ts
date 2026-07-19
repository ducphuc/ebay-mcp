import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EbayApiClient } from '@/api/client.js';
import { MediaApi } from '@/api/media/media.js';
import { EndpointInputError } from '@/api/shared/request.js';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('MediaApi', () => {
  let client: EbayApiClient;
  let api: MediaApi;
  let tempDir: string | undefined;

  beforeEach(() => {
    client = {
      requestRaw: vi.fn(),
    } as unknown as EbayApiClient;
    api = new MediaApi(client);
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it('creates an image from a local file using multipart Media API upload', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ebay-media-'));
    const filePath = join(tempDir, 'photo.jpg');
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

    vi.mocked(client.requestRaw).mockResolvedValue({
      data: {
        imageUrl: 'https://i.ebayimg.com/images/g/example/s-l1600.jpg',
        maxDimensionImageUrl: 'https://i.ebayimg.com/images/g/example/s-l1600.jpg',
        expirationDate: '2026-06-18T00:00:00.000Z',
      },
      headers: {
        location: 'https://apim.ebay.com/commerce/media/v1_beta/image/IMAGE-123',
      },
      status: 201,
      statusText: 'Created',
    });

    const result = await Effect.runPromise(api.createImageFromFile({ filePath }));

    expect(client.requestRaw).toHaveBeenCalledWith(
      'POST',
      '/commerce/media/v1_beta/image/create_image_from_file',
      expect.any(Buffer),
      expect.objectContaining({
        baseURL: 'https://apim.ebay.com',
        headers: expect.objectContaining({
          'Content-Type': expect.stringContaining('multipart/form-data; boundary='),
        }),
      }),
    );
    expect(result).toEqual({
      imageId: 'IMAGE-123',
      location: 'https://apim.ebay.com/commerce/media/v1_beta/image/IMAGE-123',
      imageUrl: 'https://i.ebayimg.com/images/g/example/s-l1600.jpg',
      maxDimensionImageUrl: 'https://i.ebayimg.com/images/g/example/s-l1600.jpg',
      expirationDate: '2026-06-18T00:00:00.000Z',
    });
  });

  it('fails with a tagged input error before calling eBay when the local file does not exist', async () => {
    const result = await Effect.runPromise(
      Effect.either(api.createImageFromFile({ filePath: '/no/such/file.jpg' })),
    );

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(EndpointInputError);
      expect(result.left.message).toContain('filePath is not readable');
    }
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('creates an image from a URL', async () => {
    vi.mocked(client.requestRaw).mockResolvedValue({
      data: { imageUrl: 'https://i.ebayimg.com/images/g/example/s-l1600.jpg' },
      headers: {
        Location: 'https://apim.ebay.com/commerce/media/v1_beta/image/IMAGE-456',
      },
      status: 201,
      statusText: 'Created',
    });

    const result = await Effect.runPromise(
      api.createImageFromUrl({ imageUrl: 'https://example.com/photo.png' }),
    );

    expect(client.requestRaw).toHaveBeenCalledWith(
      'POST',
      '/commerce/media/v1_beta/image/create_image_from_url',
      { imageUrl: 'https://example.com/photo.png' },
      { baseURL: 'https://apim.ebay.com' },
    );
    expect(result.imageId).toBe('IMAGE-456');
    expect(result.location).toBe('https://apim.ebay.com/commerce/media/v1_beta/image/IMAGE-456');
  });

  it('gets an image by ID', async () => {
    const mockResponse = {
      imageUrl: 'https://i.ebayimg.com/images/g/example/s-l1600.jpg',
      expirationDate: '2026-06-18T00:00:00.000Z',
    };
    vi.mocked(client.requestRaw).mockResolvedValue({
      data: mockResponse,
      headers: {},
      status: 200,
      statusText: 'OK',
    });

    const result = await Effect.runPromise(api.getImage({ imageId: 'IMAGE 789' }));

    expect(client.requestRaw).toHaveBeenCalledWith(
      'GET',
      '/commerce/media/v1_beta/image/IMAGE%20789',
      undefined,
      { baseURL: 'https://apim.ebay.com' },
    );
    expect(result).toEqual(mockResponse);
  });

  it('uses sandbox apim host when constructed for sandbox', async () => {
    const sandboxApi = new MediaApi(client, 'sandbox');
    vi.mocked(client.requestRaw).mockResolvedValue({
      data: { imageUrl: 'https://i.ebayimg.com/images/g/example/s-l1600.jpg' },
      headers: {},
      status: 200,
      statusText: 'OK',
    });

    await Effect.runPromise(sandboxApi.getImage({ imageId: 'IMAGE-123' }));

    expect(client.requestRaw).toHaveBeenCalledWith(
      'GET',
      '/commerce/media/v1_beta/image/IMAGE-123',
      undefined,
      { baseURL: 'https://apim.sandbox.ebay.com' },
    );
  });

  it('routes media traffic through the configured API base URL override', async () => {
    const proxiedApi = new MediaApi(client, 'production', 'https://proxy.internal');
    vi.mocked(client.requestRaw).mockResolvedValue({
      data: {},
      headers: {},
      status: 200,
      statusText: 'OK',
    });

    await Effect.runPromise(proxiedApi.getImage({ imageId: 'IMAGE-123' }));

    expect(client.requestRaw).toHaveBeenCalledWith(
      'GET',
      '/commerce/media/v1_beta/image/IMAGE-123',
      undefined,
      { baseURL: 'https://proxy.internal' },
    );
  });
});
