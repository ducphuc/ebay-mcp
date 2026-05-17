import { dirname, isAbsolute, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Environment variable that overrides where ebay-mcp reads and writes its .env file.
 */
export const EBAY_ENV_PATH_VARIABLE = 'EBAY_ENV_PATH';

/**
 * Default .env path next to the installed package root.
 *
 * In source this resolves to <repo>/.env from src/config/env-path.ts.
 * In a built/global install this resolves to <package>/.env from build/config/env-path.js.
 */
export function getPackageEnvPath(): string {
  return join(__dirname, '../../.env');
}

/**
 * Resolve the .env file used for both loading eBay config and persisting refreshed tokens.
 *
 * EBAY_ENV_PATH may be absolute or relative. Relative override paths are resolved against
 * the current working directory, matching normal CLI path expectations.
 */
export function getEbayEnvPath(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[EBAY_ENV_PATH_VARIABLE]?.trim();

  if (override) {
    return isAbsolute(override) ? override : resolve(process.cwd(), override);
  }

  return getPackageEnvPath();
}
