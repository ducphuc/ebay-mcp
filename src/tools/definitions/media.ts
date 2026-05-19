import { z } from 'zod';
import type { OutputArgs, ToolDefinition } from '../tool-definitions.js';

const imageResponseOutputSchema = {
  type: 'object',
  properties: {
    imageId: {
      type: 'string',
      description: 'The EPS image ID parsed from the Location response header when available',
    },
    location: {
      type: 'string',
      description: 'The getImage URI returned in the Location response header when available',
    },
    imageUrl: {
      type: 'string',
      description: 'The EPS URL to use in Trading or Inventory API listing image fields',
    },
    maxDimensionImageUrl: {
      type: 'string',
      description: 'The EPS URL for the maximum dimension version of the image',
    },
    expirationDate: {
      type: 'string',
      description: 'UTC expiration date for unused EPS images',
    },
  },
  description: 'eBay Media API image response',
} as OutputArgs;

/** Commerce Media API tools for eBay Picture Services image uploads. */
export const mediaTools: ToolDefinition[] = [
  {
    name: 'ebay_media_create_image_from_file',
    description:
      'Upload a local image file to eBay Picture Services (EPS) using the Commerce Media API. Uses the standard eBay REST Authorization header. Required OAuth Scope: sell.inventory. Supported formats include JPG, GIF, PNG, BMP, TIFF, AVIF, HEIC, and WEBP.',
    inputSchema: {
      filePath: z.string().describe('Path to the local image file to upload'),
      fileName: z
        .string()
        .optional()
        .describe(
          'Optional filename to send in the multipart upload; defaults to basename(filePath)'
        ),
      mimeType: z
        .string()
        .optional()
        .describe('Optional image MIME type; inferred from file extension when omitted'),
    },
    outputSchema: imageResponseOutputSchema,
  },
  {
    name: 'ebay_media_create_image_from_url',
    description:
      'Upload an image to eBay Picture Services (EPS) from a publicly reachable HTTPS URL using the Commerce Media API. Uses the standard eBay REST Authorization header. Required OAuth Scope: sell.inventory.',
    inputSchema: {
      imageUrl: z.string().describe('Public HTTPS URL of the image eBay should fetch into EPS'),
    },
    outputSchema: imageResponseOutputSchema,
  },
  {
    name: 'ebay_media_get_image',
    description:
      'Retrieve an EPS image URL and expiration details from the Commerce Media API. Required OAuth Scope: sell.inventory.',
    inputSchema: {
      imageId: z.string().describe('The eBay Picture Services image ID'),
    },
    outputSchema: imageResponseOutputSchema,
  },
];
