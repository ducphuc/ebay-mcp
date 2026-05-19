import { describe, it, expect, vi } from 'vitest';
import { executeTool } from '@/tools/index.js';

describe('Media tool handlers', () => {
  it('executes ebay_media_create_image_from_file', async () => {
    const api = {
      media: {
        createImageFromFile: vi.fn().mockResolvedValue({ imageId: 'IMAGE-123' }),
      },
    };

    const result = await executeTool(api as never, 'ebay_media_create_image_from_file', {
      filePath: '/tmp/photo.jpg',
      fileName: 'listing.jpg',
      mimeType: 'image/jpeg',
    });

    expect(api.media.createImageFromFile).toHaveBeenCalledWith('/tmp/photo.jpg', {
      fileName: 'listing.jpg',
      mimeType: 'image/jpeg',
    });
    expect(result).toEqual({ imageId: 'IMAGE-123' });
  });

  it('executes ebay_media_create_image_from_url', async () => {
    const api = {
      media: {
        createImageFromUrl: vi.fn().mockResolvedValue({ imageId: 'IMAGE-456' }),
      },
    };

    await executeTool(api as never, 'ebay_media_create_image_from_url', {
      imageUrl: 'https://example.com/photo.png',
    });

    expect(api.media.createImageFromUrl).toHaveBeenCalledWith('https://example.com/photo.png');
  });

  it('executes ebay_media_get_image', async () => {
    const api = {
      media: {
        getImage: vi.fn().mockResolvedValue({ imageUrl: 'https://i.ebayimg.com/image.jpg' }),
      },
    };

    await executeTool(api as never, 'ebay_media_get_image', { imageId: 'IMAGE-789' });

    expect(api.media.getImage).toHaveBeenCalledWith('IMAGE-789');
  });
});
