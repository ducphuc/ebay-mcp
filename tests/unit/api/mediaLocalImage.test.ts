import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectMediaImageMimeType, readLocalMediaImage } from '@/api/media/localImage.js';
import { MAX_MEDIA_IMAGE_BYTES } from '@/config/media.js';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const isoBmff = (majorBrand: string, compatibleBrand = majorBrand): Buffer => {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt32BE(24, 0);
  buffer.write('ftyp', 4, 'ascii');
  buffer.write(majorBrand, 8, 'ascii');
  buffer.writeUInt32BE(0, 12);
  buffer.write(compatibleBrand, 16, 'ascii');
  buffer.write('mif1', 20, 'ascii');
  return buffer;
};

describe('local Media image security', () => {
  let tempBase: string;
  let mediaRoot: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'ebay-media-root-'));
    mediaRoot = join(tempBase, 'allowed');
    await mkdir(mediaRoot);
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('allows relative and contained absolute paths beneath the canonical root', async () => {
    const filePath = join(mediaRoot, 'photo.jpg');
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

    const relativeImage = await Effect.runPromise(
      readLocalMediaImage('photo.jpg', mediaRoot, undefined),
    );
    const absoluteImage = await Effect.runPromise(
      readLocalMediaImage(filePath, mediaRoot, 'image/jpeg'),
    );

    expect(relativeImage.canonicalPath).toBe(await realpath(filePath));
    expect(absoluteImage.mimeType).toBe('image/jpeg');
  });

  it('keeps the tool unavailable until an absolute root directory is configured', async () => {
    const unset = await Effect.runPromise(
      Effect.either(readLocalMediaImage('photo.jpg', undefined, undefined)),
    );
    const relative = await Effect.runPromise(
      Effect.either(readLocalMediaImage('photo.jpg', 'relative/root', undefined)),
    );
    const rootFile = join(tempBase, 'root-file');
    await writeFile(rootFile, 'not a directory');
    const fileRoot = await Effect.runPromise(
      Effect.either(readLocalMediaImage(rootFile, rootFile, undefined)),
    );
    const missingRoot = await Effect.runPromise(
      Effect.either(readLocalMediaImage('photo.jpg', join(tempBase, 'missing-root'), undefined)),
    );

    expect(unset._tag).toBe('Left');
    expect(relative._tag).toBe('Left');
    expect(fileRoot._tag).toBe('Left');
    expect(missingRoot._tag).toBe('Left');
    if (missingRoot._tag === 'Left') {
      expect(missingRoot.left.parameter).toBe('EBAY_MCP_MEDIA_ROOT');
    }
  });

  it.each([
    '../outside.jpg',
    'prefix collision',
  ])('rejects containment escape: %s', async (kind) => {
    const outsidePath =
      kind === 'prefix collision'
        ? join(tempBase, 'allowed-prefix', 'outside.jpg')
        : join(tempBase, 'outside.jpg');
    await mkdir(join(outsidePath, '..'), { recursive: true });
    await writeFile(outsidePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

    const candidate = kind === 'prefix collision' ? outsidePath : '../outside.jpg';
    const result = await Effect.runPromise(
      Effect.either(readLocalMediaImage(candidate, mediaRoot, undefined)),
    );

    expect(result._tag).toBe('Left');
  });

  it('rejects a symlink whose target escapes the root', async () => {
    const outsidePath = join(tempBase, 'outside.jpg');
    await writeFile(outsidePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    await symlink(outsidePath, join(mediaRoot, 'link.jpg'));

    const result = await Effect.runPromise(
      Effect.either(readLocalMediaImage('link.jpg', mediaRoot, undefined)),
    );

    expect(result._tag).toBe('Left');
  });

  it('rejects non-regular files and files larger than 12 MiB', async () => {
    const directoryResult = await Effect.runPromise(
      Effect.either(readLocalMediaImage('.', mediaRoot, undefined)),
    );
    await writeFile(join(mediaRoot, 'large.jpg'), Buffer.alloc(MAX_MEDIA_IMAGE_BYTES + 1, 0xff));
    const largeResult = await Effect.runPromise(
      Effect.either(readLocalMediaImage('large.jpg', mediaRoot, undefined)),
    );

    expect(directoryResult._tag).toBe('Left');
    expect(largeResult._tag).toBe('Left');
  });

  it('uses detected content as authoritative and rejects MIME mismatches', async () => {
    await writeFile(join(mediaRoot, 'misnamed.png'), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

    const detected = await Effect.runPromise(
      readLocalMediaImage('misnamed.png', mediaRoot, undefined),
    );
    const mismatch = await Effect.runPromise(
      Effect.either(readLocalMediaImage('misnamed.png', mediaRoot, 'image/png')),
    );

    expect(detected.mimeType).toBe('image/jpeg');
    expect(mismatch._tag).toBe('Left');
  });
});

describe('Media image signature detection', () => {
  it.each([
    ['JPEG', Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg'],
    ['PNG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    ['GIF', Buffer.from('GIF89a', 'ascii'), 'image/gif'],
    ['BMP', Buffer.from([0x42, 0x4d]), 'image/bmp'],
    ['little-endian TIFF', Buffer.from([0x49, 0x49, 0x2a, 0x00]), 'image/tiff'],
    ['big-endian TIFF', Buffer.from([0x4d, 0x4d, 0x00, 0x2a]), 'image/tiff'],
    ['WEBP', Buffer.from('RIFF0000WEBP', 'ascii'), 'image/webp'],
    ['AVIF major brand', isoBmff('avif'), 'image/avif'],
    ['AVIF compatible brand', isoBmff('mif1', 'avis'), 'image/avif'],
    ['HEIC major brand', isoBmff('heic'), 'image/heic'],
    ['HEIC compatible brand', isoBmff('mif1', 'heix'), 'image/heic'],
  ])('detects %s content', (_name, buffer, expected) => {
    expect(detectMediaImageMimeType(buffer as Buffer)).toBe(expected);
  });

  it('requires both RIFF and WEBP identifiers and rejects unknown content', () => {
    expect(detectMediaImageMimeType(Buffer.from('RIFF0000NOPE', 'ascii'))).toBeUndefined();
    expect(detectMediaImageMimeType(Buffer.from('not an image'))).toBeUndefined();
  });
});
