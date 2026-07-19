import { dirname, isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Environment variable that overrides where ebay-mcp reads and writes its .env file.
 */
export const EBAY_ENV_PATH_VARIABLE = 'EBAY_ENV_PATH';

/**
 * Default .env path next to the installed package root.
 *
 * In source this resolves to `<repo>/.env` from src/config/envPath.ts.
 * In a built/global install this resolves to `<package>/.env` from build/config/envPath.js.
 *
 * @returns Absolute path of the package-root .env file.
 *
 * @example
 * ```ts
 * const envPath = getPackageEnvPath();
 * ```
 */
export const getPackageEnvPath = (): string => join(__dirname, '../../.env');

/**
 * Resolve the .env file used for both loading eBay config and persisting refreshed tokens.
 *
 * `EBAY_ENV_PATH` may be absolute or relative. Relative override paths are resolved
 * against the current working directory, matching normal CLI path expectations. Both
 * config loading and token persistence must use this path so refreshed tokens land in
 * the same file the server reads on the next start.
 *
 * @param env - Environment object read for the `EBAY_ENV_PATH` override.
 * @returns Absolute path of the .env file to load and persist credentials in.
 *
 * @example
 * ```ts
 * const envPath = getEbayEnvPath();
 * ```
 */
export const getEbayEnvPath = (env: NodeJS.ProcessEnv = process.env): string => {
  const override = env[EBAY_ENV_PATH_VARIABLE]?.trim();

  if (override) {
    return isAbsolute(override) ? override : resolve(process.cwd(), override);
  }

  return getPackageEnvPath();
};
