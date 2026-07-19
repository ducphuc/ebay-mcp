import {
  createImageFromFileInputSchema,
  createImageFromUrlInputSchema,
  getImageInputSchema,
} from '@/schemas/media/media.js';
import { defineTool } from '@/tools/defineTool.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

/** Commerce Media API tools for eBay Picture Services image uploads. */
export const mediaEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_media_create_image_from_file',
    description:
      'Upload a local image file to eBay Picture Services (EPS) using the Commerce Media API. Uses the standard eBay REST Authorization header. Required OAuth Scope: sell.inventory. Supported formats include JPG, GIF, PNG, BMP, TIFF, AVIF, HEIC, and WEBP.',
    inputSchema: createImageFromFileInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.media.createImageFromFile(args)),
  }),
  defineTool({
    name: 'ebay_media_create_image_from_url',
    description:
      'Upload an image to eBay Picture Services (EPS) from a publicly reachable HTTPS URL using the Commerce Media API. Uses the standard eBay REST Authorization header. Required OAuth Scope: sell.inventory.',
    inputSchema: createImageFromUrlInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.media.createImageFromUrl(args)),
  }),
  defineTool({
    name: 'ebay_media_get_image',
    description:
      'Retrieve an EPS image URL and expiration details from the Commerce Media API. Required OAuth Scope: sell.inventory.',
    inputSchema: getImageInputSchema.shape,
    handler: (api, args) => Effect.runPromise(api.media.getImage(args)),
  }),
];
