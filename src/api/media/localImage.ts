import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { EndpointInputError } from '@/api/shared/request.js';
import { MAX_MEDIA_IMAGE_BYTES, type SupportedMediaMimeType } from '@/config/media.js';
import { getErrorMessage } from '@/utils/errors.js';
import { Effect } from 'effect';

const startsWithBytes = (buffer: Buffer, bytes: readonly number[]): boolean =>
  buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);

const fourCc = (buffer: Buffer, offset: number): string | undefined =>
  offset + 4 <= buffer.length ? buffer.toString('ascii', offset, offset + 4) : undefined;

const AVIF_BRANDS = new Set(['avif', 'avis']);
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

interface IsoBoxHeader {
  readonly boxSize: number;
  readonly headerSize: number;
  readonly type: string | undefined;
}

const readIsoBoxHeader = (buffer: Buffer, offset: number): IsoBoxHeader | undefined => {
  if (offset + 8 > buffer.length) return;

  const declaredSize = buffer.readUInt32BE(offset);
  const type = fourCc(buffer, offset + 4);
  if (declaredSize === 1) {
    if (offset + 16 > buffer.length) return;
    const largeSize = buffer.readBigUInt64BE(offset + 8);
    if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) return;
    return { boxSize: Number(largeSize), headerSize: 16, type };
  }

  return {
    boxSize: declaredSize === 0 ? buffer.length - offset : declaredSize,
    headerSize: 8,
    type,
  };
};

const readFtypBrands = (buffer: Buffer, offset: number, box: IsoBoxHeader): string[] => {
  const brands: string[] = [];
  const majorBrand = fourCc(buffer, offset + box.headerSize);
  if (majorBrand) {
    brands.push(majorBrand);
  }
  for (
    let brandOffset = offset + box.headerSize + 8;
    brandOffset + 4 <= offset + box.boxSize;
    brandOffset += 4
  ) {
    const brand = fourCc(buffer, brandOffset);
    if (brand) {
      brands.push(brand);
    }
  }
  return brands;
};

/** Detect AVIF/HEIC by parsing ISO-BMFF boxes and the ftyp brand table. */
const detectIsoBmffMimeType = (buffer: Buffer): SupportedMediaMimeType | undefined => {
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const box = readIsoBoxHeader(buffer, offset);
    if (!box || box.boxSize < box.headerSize || offset + box.boxSize > buffer.length) return;

    if (box.type === 'ftyp' && box.boxSize >= box.headerSize + 8) {
      const brands = readFtypBrands(buffer, offset, box);

      if (brands.some((brand) => AVIF_BRANDS.has(brand))) return 'image/avif';
      if (brands.some((brand) => HEIC_BRANDS.has(brand))) return 'image/heic';
      return;
    }

    offset += box.boxSize;
  }

  return;
};

/** Detect a supported image MIME type from the file contents. */
const detectMediaImageMimeType = (buffer: Buffer): SupportedMediaMimeType | undefined => {
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (
    buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
    buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
  ) {
    return 'image/gif';
  }
  if (startsWithBytes(buffer, [0x42, 0x4d])) return 'image/bmp';
  if (
    startsWithBytes(buffer, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWithBytes(buffer, [0x4d, 0x4d, 0x00, 0x2a])
  ) {
    return 'image/tiff';
  }
  if (fourCc(buffer, 0) === 'RIFF' && fourCc(buffer, 8) === 'WEBP') return 'image/webp';

  return detectIsoBmffMimeType(buffer);
};

const outsideRoot = (root: string, candidate: string): boolean => {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot);
};

const mediaInputError = (parameter: string, message: string): EndpointInputError =>
  new EndpointInputError({ parameter, message });

/** Read and validate a local image from the configured upload root. */
const readLocalMediaImage = (
  filePath: string,
  configuredRoot: string | undefined,
  assertedMimeType: SupportedMediaMimeType | undefined,
): Effect.Effect<LocalMediaImage, EndpointInputError> =>
  Effect.tryPromise({
    try: async () => {
      if (!configuredRoot) {
        throw mediaInputError(
          'EBAY_MCP_MEDIA_ROOT',
          'Local Media uploads are disabled. Set EBAY_MCP_MEDIA_ROOT to an absolute allowed image directory.',
        );
      }
      if (!isAbsolute(configuredRoot)) {
        throw mediaInputError(
          'EBAY_MCP_MEDIA_ROOT',
          'EBAY_MCP_MEDIA_ROOT must be an absolute directory path.',
        );
      }

      const canonicalRoot = await realpath(configuredRoot).catch((cause: unknown) => {
        throw mediaInputError(
          'EBAY_MCP_MEDIA_ROOT',
          `EBAY_MCP_MEDIA_ROOT is not readable: ${getErrorMessage(cause)}`,
        );
      });
      const rootStats = await stat(canonicalRoot).catch((cause: unknown) => {
        throw mediaInputError(
          'EBAY_MCP_MEDIA_ROOT',
          `EBAY_MCP_MEDIA_ROOT is not readable: ${getErrorMessage(cause)}`,
        );
      });
      if (!rootStats.isDirectory()) {
        throw mediaInputError(
          'EBAY_MCP_MEDIA_ROOT',
          'EBAY_MCP_MEDIA_ROOT must resolve to a directory.',
        );
      }
      const requestedPath = isAbsolute(filePath) ? filePath : resolve(canonicalRoot, filePath);
      const canonicalPath = await realpath(requestedPath);
      if (outsideRoot(canonicalRoot, canonicalPath)) {
        throw mediaInputError('filePath', 'filePath must resolve inside EBAY_MCP_MEDIA_ROOT.');
      }

      const fileStats = await stat(canonicalPath);
      if (!fileStats.isFile()) {
        throw mediaInputError('filePath', 'filePath must resolve to a regular file.');
      }
      if (fileStats.size > MAX_MEDIA_IMAGE_BYTES) {
        throw mediaInputError(
          'filePath',
          `Image exceeds the ${MAX_MEDIA_IMAGE_BYTES}-byte upload limit.`,
        );
      }

      const buffer = await readFile(canonicalPath);
      if (buffer.byteLength > MAX_MEDIA_IMAGE_BYTES) {
        throw mediaInputError(
          'filePath',
          `Image exceeds the ${MAX_MEDIA_IMAGE_BYTES}-byte upload limit.`,
        );
      }

      const detectedMimeType = detectMediaImageMimeType(buffer);
      if (!detectedMimeType) {
        throw mediaInputError('filePath', 'filePath is not a supported image file.');
      }
      if (assertedMimeType && assertedMimeType !== detectedMimeType) {
        throw mediaInputError(
          'mimeType',
          `mimeType ${assertedMimeType} does not match detected type ${detectedMimeType}.`,
        );
      }

      return { buffer, canonicalPath, mimeType: detectedMimeType };
    },
    catch: (cause) =>
      cause instanceof EndpointInputError
        ? cause
        : mediaInputError('filePath', `filePath is not readable: ${getErrorMessage(cause)}`),
  });

/** Validated local image content ready for multipart upload. */
export interface LocalMediaImage {
  readonly buffer: Buffer;
  readonly canonicalPath: string;
  readonly mimeType: SupportedMediaMimeType;
}

export { detectMediaImageMimeType, readLocalMediaImage };
