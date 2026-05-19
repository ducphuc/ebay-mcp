import type { ToolHandlerMap } from './types.js';

/** Handler map for Commerce Media API image tools. */
export const mediaHandlers: ToolHandlerMap = {
  ebay_media_create_image_from_file: async (api, args) => {
    return await api.media.createImageFromFile(args.filePath as string, {
      fileName: args.fileName as string | undefined,
      mimeType: args.mimeType as string | undefined,
    });
  },

  ebay_media_create_image_from_url: async (api, args) => {
    return await api.media.createImageFromUrl(args.imageUrl as string);
  },

  ebay_media_get_image: async (api, args) => {
    return await api.media.getImage(args.imageId as string);
  },
};
