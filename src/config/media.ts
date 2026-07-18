import process from 'node:process';

/** Maximum local image size accepted by the MCP Media upload tool (12 MiB). */
export const MAX_MEDIA_IMAGE_BYTES = 12 * 1024 * 1024;

/** Image MIME types supported by eBay Picture Services. */
export const SUPPORTED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/gif',
  'image/png',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'image/heic',
  'image/webp',
] satisfies [string, ...string[]];

/** Supported eBay Picture Services image MIME type. */
export type SupportedMediaMimeType = (typeof SUPPORTED_MEDIA_MIME_TYPES)[number];

/** Narrow an arbitrary MIME assertion to one supported by eBay Picture Services. */
export const isSupportedMediaMimeType = (value: string): value is SupportedMediaMimeType =>
  (SUPPORTED_MEDIA_MIME_TYPES as readonly string[]).includes(value);

/** Read the configured root for local Media API uploads. */
export const getMediaUploadRoot = (env: NodeJS.ProcessEnv = process.env): string | undefined =>
  env.EBAY_MCP_MEDIA_ROOT?.trim() || undefined;
