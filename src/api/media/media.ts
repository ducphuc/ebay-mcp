import { basename, extname } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { EbayApiClient } from '@/api/client.js';
import { getMediaBaseUrl } from '@/config/environment.js';
import { requireString, withApiError } from '@/api/shared/request.js';

export interface ImageResponse {
  expirationDate?: string;
  imageUrl?: string;
  maxDimensionImageUrl?: string;
}

export interface MediaImageResponse extends ImageResponse {
  imageId?: string;
  location?: string;
}

export interface CreateImageFromFileOptions {
  fileName?: string;
  mimeType?: string;
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webp': 'image/webp',
};

function inferMimeType(filePath: string, providedMimeType?: string): string {
  if (providedMimeType) {
    return providedMimeType;
  }

  return EXTENSION_MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function getHeader(headers: Record<string, unknown>, headerName: string): string | undefined {
  const lowerName = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lowerName) {
      continue;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
  }

  return undefined;
}

function extractImageId(location?: string): string | undefined {
  if (!location) {
    return undefined;
  }

  const match = /\/image\/([^/?#]+)/.exec(location);
  return match?.[1];
}

function escapeMultipartFileName(fileName: string): string {
  return fileName.replace(/["\r\n]/g, '_');
}

function createMultipartImageBody(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): { body: Buffer; contentType: string } {
  const boundary = `----ebay-mcp-media-${randomUUID()}`;
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="${escapeMultipartFileName(fileName)}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

  return {
    body: Buffer.concat([header, fileBuffer, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function normalizeCreateImageResponse(
  body: ImageResponse | undefined,
  headers: Record<string, unknown>
): MediaImageResponse {
  const location = getHeader(headers, 'location');
  return {
    ...(body ?? {}),
    imageId: extractImageId(location),
    location,
  };
}

/** Commerce Media API tools for eBay Picture Services image uploads. */
export class MediaApi {
  private readonly basePath = '/commerce/media/v1_beta';
  private readonly mediaBaseUrl: string;

  constructor(
    private client: EbayApiClient,
    environment: 'production' | 'sandbox' = 'production'
  ) {
    this.mediaBaseUrl = getMediaBaseUrl(environment);
  }

  /**
   * Upload a local image file to eBay Picture Services (EPS).
   * Endpoint: POST /image/create_image_from_file
   */
  async createImageFromFile(
    filePath: string,
    options: CreateImageFromFileOptions = {}
  ): Promise<MediaImageResponse> {
    requireString(filePath, 'filePath');

    return await withApiError('Failed to create image from file', async () => {
      await access(filePath);

      const fileBuffer = await readFile(filePath);
      const mimeType = inferMimeType(filePath, options.mimeType);
      const fileName = options.fileName ?? basename(filePath);
      const multipart = createMultipartImageBody(fileBuffer, fileName, mimeType);

      const response = await this.client.requestRaw<ImageResponse>(
        'POST',
        `${this.basePath}/image/create_image_from_file`,
        multipart.body,
        {
          baseURL: this.mediaBaseUrl,
          headers: { 'Content-Type': multipart.contentType },
        }
      );

      return normalizeCreateImageResponse(response.data, response.headers);
    });
  }

  /**
   * Upload an image to EPS from a publicly reachable HTTPS URL.
   * Endpoint: POST /image/create_image_from_url
   */
  async createImageFromUrl(imageUrl: string): Promise<MediaImageResponse> {
    requireString(imageUrl, 'imageUrl');

    return await withApiError('Failed to create image from URL', async () => {
      const response = await this.client.requestRaw<ImageResponse>(
        'POST',
        `${this.basePath}/image/create_image_from_url`,
        { imageUrl },
        { baseURL: this.mediaBaseUrl }
      );

      return normalizeCreateImageResponse(response.data, response.headers);
    });
  }

  /**
   * Retrieve an EPS image URL and expiration details.
   * Endpoint: GET /image/{image_id}
   */
  async getImage(imageId: string): Promise<ImageResponse> {
    requireString(imageId, 'imageId');

    return await withApiError('Failed to get image', async () => {
      const response = await this.client.requestRaw<ImageResponse>(
        'GET',
        `${this.basePath}/image/${encodeURIComponent(imageId)}`,
        undefined,
        { baseURL: this.mediaBaseUrl }
      );

      return response.data;
    });
  }
}
