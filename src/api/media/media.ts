import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { EbayApiClient } from '@/api/client.js';
import {
  EbayApiError,
  EndpointInputError,
  optionalStringEffect,
  requireObjectEffect,
  requireStringEffect,
} from '@/api/shared/request.js';
import type { EbayEnvironment } from '@/config/environment.js';
import { getMediaBaseUrl } from '@/config/environment.js';
import type {
  createImageFromFileInputSchema,
  createImageFromUrlInputSchema,
  getImageInputSchema,
} from '@/schemas/media/media.js';
import type { InferEffectSchema } from '@/utils/effectSchemaTypes.js';
import { getErrorMessage } from '@/utils/errors.js';
import { Effect } from 'effect';

/** Input accepted by createImageFromFile. */
export type CreateImageFromFileInput = InferEffectSchema<typeof createImageFromFileInputSchema>;

/** Input accepted by createImageFromUrl. */
export type CreateImageFromUrlInput = InferEffectSchema<typeof createImageFromUrlInputSchema>;

/** Input accepted by getImage. */
export type GetImageInput = InferEffectSchema<typeof getImageInputSchema>;

/**
 * Image response body returned by the Commerce Media API.
 *
 * @see https://developer.ebay.com/api-docs/commerce/media/resources/image/methods/getImage
 */
export interface ImageResponse {
  /** UTC expiration date for unused EPS images. */
  expirationDate?: string;
  /** EPS URL to use in Trading or Inventory API listing image fields. */
  imageUrl?: string;
  /** EPS URL for the maximum dimension version of the image. */
  maxDimensionImageUrl?: string;
}

/** Image response extended with identifiers parsed from the `Location` response header. */
export interface MediaImageResponse extends ImageResponse {
  /** EPS image ID parsed from the Location response header when available. */
  imageId?: string;
  /** getImage URI returned in the Location response header when available. */
  location?: string;
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

const inferMimeType = (filePath: string, providedMimeType: string | undefined): string => {
  if (providedMimeType) {
    return providedMimeType;
  }

  return EXTENSION_MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
};

const getHeader = (headers: Record<string, string>, headerName: string): string | undefined => {
  const lowerName = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lowerName) {
      continue;
    }

    if (typeof value === 'string') {
      return value;
    }
  }

  return undefined;
};

const extractImageId = (location: string | undefined): string | undefined => {
  if (!location) {
    return undefined;
  }

  const match = /\/image\/([^/?#]+)/.exec(location);
  return match?.[1];
};

const escapeMultipartFileName = (fileName: string): string => fileName.replace(/["\r\n]/g, '_');

const createMultipartImageBody = (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): { body: Buffer; contentType: string } => {
  const boundary = `----ebay-mcp-media-${randomUUID()}`;
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="${escapeMultipartFileName(fileName)}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`,
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

  return {
    body: Buffer.concat([header, fileBuffer, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
};

const normalizeCreateImageResponse = (
  body: ImageResponse | undefined,
  headers: Record<string, string>,
): MediaImageResponse => {
  const location = getHeader(headers, 'location');
  return {
    ...(body ?? {}),
    imageId: extractImageId(location),
    location,
  };
};

/** Commerce Media API endpoints for eBay Picture Services image uploads. */
export class MediaApi {
  private readonly basePath = '/commerce/media/v1_beta';
  private readonly mediaBaseUrl: string;

  /**
   * @param client - eBay REST client that owns auth and transport details.
   * @param environment - eBay environment selecting the apim host.
   * @param apiBaseUrl - Optional base URL override (`EBAY_MCP_API_BASE_URL`), used for
   * proxy setups where all traffic must flow through one gateway.
   */
  public constructor(
    private readonly client: EbayApiClient,
    environment: EbayEnvironment = 'production',
    apiBaseUrl?: string,
  ) {
    this.mediaBaseUrl = getMediaBaseUrl(environment, apiBaseUrl);
  }

  /** Runs a raw-response Media API request with typed eBay API errors. */
  private requestRawEffect = (
    method: 'GET' | 'POST',
    path: string,
    data: unknown,
    headers: Record<string, string> | undefined,
  ): Effect.Effect<{ data: ImageResponse | undefined; headers: Record<string, string> }, EbayApiError> =>
    Effect.tryPromise({
      try: () =>
        this.client.requestRaw<ImageResponse | undefined>(method, path, data, {
          baseURL: this.mediaBaseUrl,
          ...(headers === undefined ? {} : { headers }),
        }),
      catch: (cause) => new EbayApiError({ method, path, cause }),
    });

  /**
   * Uploads a local image file to eBay Picture Services (EPS) as a multipart request.
   *
   * @param input - Local file path plus optional filename and mime-type overrides.
   * @returns An Effect that succeeds with the image response, including the image ID
   * parsed from the `Location` response header.
   *
   * @example
   * ```ts
   * const image = await Effect.runPromise(
   *   mediaApi.createImageFromFile({ filePath: '/photos/item.jpg' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/commerce/media/resources/image/methods/createImageFromFile
   */
  public createImageFromFile = (
    input: CreateImageFromFileInput,
  ): Effect.Effect<MediaImageResponse, EbayApiError | EndpointInputError> => {
    const basePath = this.basePath;
    const requestRawEffect = this.requestRawEffect;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<CreateImageFromFileInput>(input, 'input');
      const filePath = yield* requireStringEffect(validatedInput.filePath, 'filePath');
      const fileName = yield* optionalStringEffect(validatedInput.fileName, 'fileName');
      const mimeType = yield* optionalStringEffect(validatedInput.mimeType, 'mimeType');

      const fileBuffer = yield* Effect.tryPromise({
        try: () => readFile(filePath),
        catch: (cause) =>
          new EndpointInputError({
            parameter: 'filePath',
            message: `filePath is not readable: ${getErrorMessage(cause)}`,
          }),
      });

      const multipart = createMultipartImageBody(
        fileBuffer,
        fileName ?? basename(filePath),
        inferMimeType(filePath, mimeType),
      );

      const response = yield* requestRawEffect(
        'POST',
        `${basePath}/image/create_image_from_file`,
        multipart.body,
        { 'Content-Type': multipart.contentType },
      );

      return normalizeCreateImageResponse(response.data, response.headers);
    });
  };

  /**
   * Uploads an image to EPS from a publicly reachable HTTPS URL.
   *
   * @param input - Public image URL for eBay to fetch.
   * @returns An Effect that succeeds with the image response, including the image ID
   * parsed from the `Location` response header.
   *
   * @example
   * ```ts
   * const image = await Effect.runPromise(
   *   mediaApi.createImageFromUrl({ imageUrl: 'https://example.com/photo.png' }),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/commerce/media/resources/image/methods/createImageFromUrl
   */
  public createImageFromUrl = (
    input: CreateImageFromUrlInput,
  ): Effect.Effect<MediaImageResponse, EbayApiError | EndpointInputError> => {
    const basePath = this.basePath;
    const requestRawEffect = this.requestRawEffect;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<CreateImageFromUrlInput>(input, 'input');
      const imageUrl = yield* requireStringEffect(validatedInput.imageUrl, 'imageUrl');

      const response = yield* requestRawEffect(
        'POST',
        `${basePath}/image/create_image_from_url`,
        { imageUrl },
        undefined,
      );

      return normalizeCreateImageResponse(response.data, response.headers);
    });
  };

  /**
   * Retrieves an EPS image URL and expiration details by image ID.
   *
   * @param input - EPS image identifier.
   * @returns An Effect that succeeds with the image response body.
   *
   * @example
   * ```ts
   * const image = await Effect.runPromise(mediaApi.getImage({ imageId: 'IMAGE-1' }));
   * ```
   *
   * @see https://developer.ebay.com/api-docs/commerce/media/resources/image/methods/getImage
   */
  public getImage = (
    input: GetImageInput,
  ): Effect.Effect<ImageResponse, EbayApiError | EndpointInputError> => {
    const basePath = this.basePath;
    const requestRawEffect = this.requestRawEffect;

    return Effect.gen(function* () {
      const validatedInput = yield* requireObjectEffect<GetImageInput>(input, 'input');
      const imageId = yield* requireStringEffect(validatedInput.imageId, 'imageId');

      const response = yield* requestRawEffect(
        'GET',
        `${basePath}/image/${encodeURIComponent(imageId)}`,
        undefined,
        undefined,
      );

      return response.data ?? {};
    });
  };
}
