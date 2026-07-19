import { z } from '@/utils/effectSchema.js';

/** Tool input schema for ebay_media_create_image_from_file. */
export const createImageFromFileInputSchema = z.object({
  filePath: z.string().describe('Path to the local image file to upload'),
  fileName: z
    .string()
    .optional()
    .describe('Optional filename to send in the multipart upload; defaults to basename(filePath)'),
  mimeType: z
    .string()
    .optional()
    .describe('Optional image MIME type; inferred from file extension when omitted'),
});

/** Tool input schema for ebay_media_create_image_from_url. */
export const createImageFromUrlInputSchema = z.object({
  imageUrl: z.string().describe('Public HTTPS URL of the image eBay should fetch into EPS'),
});

/** Tool input schema for ebay_media_get_image. */
export const getImageInputSchema = z.object({
  imageId: z.string().describe('The eBay Picture Services image ID'),
});
