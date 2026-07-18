import {
  createImageFromFileInputSchema,
  createImageFromUrlInputSchema,
  getImageInputSchema,
  mediaImageOutputSchema,
} from '@/schemas/media/media.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

/** Commerce Media API tools for eBay Picture Services image uploads. */
export const mediaEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_media_create_image_from_file',
    description:
      'Upload a local image file beneath the configured EBAY_MCP_MEDIA_ROOT directory to eBay Picture Services (EPS). Local uploads are disabled until that absolute directory is configured. Required OAuth Scope: sell.inventory. Supported formats: JPG, GIF, PNG, BMP, TIFF, AVIF, HEIC, and WEBP.',
    title: 'Upload local eBay image',
    inputSchema: createImageFromFileInputSchema.shape,
    wireOutputSchema: mediaImageOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.media.createImageFromFile(args)),
  }),
  defineTool({
    name: 'ebay_media_create_image_from_url',
    description:
      'Upload an image to eBay Picture Services (EPS) from a publicly reachable HTTPS URL using the Commerce Media API. Uses the standard eBay REST Authorization header. Required OAuth Scope: sell.inventory.',
    inputSchema: createImageFromUrlInputSchema.shape,
    wireOutputSchema: mediaImageOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.media.createImageFromUrl(args)),
  }),
  defineTool({
    name: 'ebay_media_get_image',
    description:
      'Retrieve an EPS image URL and expiration details from the Commerce Media API. Required OAuth Scope: sell.inventory.',
    inputSchema: getImageInputSchema.shape,
    wireOutputSchema: mediaImageOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: (api, args) => Effect.runPromise(api.media.getImage(args)),
  }),
];
