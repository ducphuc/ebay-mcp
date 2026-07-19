import path from 'node:path';
import { getEbayEnvPath, getPackageEnvPath } from '@/config/envPath.js';
import { describe, expect, it } from 'vitest';
import process from 'node:process';

describe('eBay env path', () => {
  it('uses EBAY_ENV_PATH when provided as an absolute path', () => {
    const envPath = path.join(path.sep, 'tmp', 'ebay-mcp.env');

    expect(getEbayEnvPath({ EBAY_ENV_PATH: envPath } as NodeJS.ProcessEnv)).toBe(envPath);
  });

  it('resolves relative EBAY_ENV_PATH from process.cwd()', () => {
    expect(getEbayEnvPath({ EBAY_ENV_PATH: 'config/ebay.env' } as NodeJS.ProcessEnv)).toBe(
      path.resolve(process.cwd(), 'config/ebay.env'),
    );
  });

  it('falls back to the installed package .env path', () => {
    expect(getEbayEnvPath({} as NodeJS.ProcessEnv)).toBe(getPackageEnvPath());
    expect(getPackageEnvPath()).toMatch(/[\\/]\.env$/);
  });
});
