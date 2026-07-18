import { z } from '@/utils/effectSchema.js';
import { SUPPORTED_MEDIA_MIME_TYPES } from '@/config/media.js';

/** Executable MCP output contract for Commerce Media image operations. */
export const mediaImageOutputSchema = z
  .object({
    imageId: z.string().optional(),
    location: z.string().optional(),
    imageUrl: z.string().optional(),
    maxDimensionImageUrl: z.string().optional(),
    expirationDate: z.string().optional(),
  })
  .passthrough();

/** Tool input schema for ebay_media_create_image_from_file. */
export const createImageFromFileInputSchema = z.object({
  filePath: z.string().describe('Path to the local image file to upload'),
  fileName: z
    .string()
    .optional()
    .describe('Optional filename to send in the multipart upload; defaults to basename(filePath)'),
  mimeType: z
    .enum(SUPPORTED_MEDIA_MIME_TYPES)
    .optional()
    .describe('Optional supported MIME assertion; detected file content remains authoritative'),
});

/** Tool input schema for ebay_media_create_image_from_url. */
export const createImageFromUrlInputSchema = z.object({
  imageUrl: z.string().describe('Public HTTPS URL of the image eBay should fetch into EPS'),
});

/** Tool input schema for ebay_media_get_image. */
export const getImageInputSchema = z.object({
  imageId: z.string().describe('The eBay Picture Services image ID'),
});
