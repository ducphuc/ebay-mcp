import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getEbayEnvPath } from '@/config/envPath.js';
import type { EbayConfig } from '@/types/ebay.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { getToolGatingConfigError } from '@/config/toolFamilies.js';
import { getErrorMessage } from '@/utils/errors.js';
import { getVersion } from '@/utils/version.js';
import { Effect, Either } from 'effect';
import process from 'node:process';

// Get the current directory for loading scope files and .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the resolved eBay env path (EBAY_ENV_PATH override or the package
// root), not process.cwd(). MCP servers inherit cwd from the host (e.g. Claude
// Code's project dir), so process.cwd() may point to an unrelated project with a
// different .env. Token persistence resolves the same path so refreshed tokens
// land in the file that is loaded here.
config({ path: getEbayEnvPath(), quiet: true });

const writeConfigDiagnostic = (message: string): void => {
  process.stderr.write(`[eBay MCP] ${message}\n`);
};

/** Supported eBay API environment key. */
export type EbayEnvironment = 'production' | 'sandbox';

/** One row in the checked-in eBay OAuth scope JSON files. */
interface ScopeDefinition {
  /** OAuth scope URI. */
  Scope: string;
  /** Human-readable scope description from eBay's scope table. */
  Description: string;
}

/** Result returned when validating requested OAuth scopes. */
export interface ScopeValidationResult {
  /** Non-fatal warnings for scopes outside the selected environment. */
  warnings: string[];
  /** Requested scopes preserved for the authorization request. */
  validScopes: string[];
}

/** Startup environment validation result. */
export interface EnvironmentValidationResult {
  /** Whether startup can continue. */
  isValid: boolean;
  /** Non-fatal configuration warnings. */
  warnings: string[];
  /** Fatal configuration errors. */
  errors: string[];
  /** Informational startup notices. */
  infos: string[];
}

/** Logger settings parsed from environment variables at process startup. */
export interface LoggingConfig {
  /** Winston-compatible log level name. */
  logLevel: string;
  /** Whether file transports should be enabled in addition to stderr. */
  enableFileLogging: boolean;
}

/** Runtime UI feature gate parsed from environment variables. */
export interface UiRuntimeConfig {
  /** Whether MCP Apps UI resources may be advertised when the client supports them. */
  enabled: boolean;
}

/**
 * Build logger settings from environment variables.
 *
 * @returns Logger level and file-logging flag used by the shared logger.
 *
 * @example
 * ```ts
 * const logging = getLoggingConfig();
 * ```
 */
export const getLoggingConfig = (): LoggingConfig => ({
  logLevel: process.env.EBAY_LOG_LEVEL || 'info',
  enableFileLogging: process.env.EBAY_ENABLE_FILE_LOGGING === 'true',
});

/**
 * Build MCP Apps UI gating config from environment variables.
 *
 * @returns UI runtime feature flag derived from `EBAY_MCP_UI`.
 *
 * @example
 * ```ts
 * const uiConfig = getUiRuntimeConfig();
 * ```
 */
export const getUiRuntimeConfig = (): UiRuntimeConfig => ({
  enabled: process.env.EBAY_MCP_UI !== 'off',
});

/** Loads and parses scopes from one checked-in scope JSON file. */
const loadScopes = (fileName: string, label: string): string[] => {
  const loaded = Effect.runSync(
    Effect.either(
      Effect.try({
        try: () => {
          const scopesPath = join(__dirname, '../../docs/auth', fileName);
          const scopesData = readFileSync(scopesPath, 'utf-8');
          const scopes: ScopeDefinition[] = JSON.parse(scopesData);

          // Filter out empty objects and extract unique scope strings
          const uniqueScopes = new Set<string>();
          scopes.forEach((item) => {
            if (item.Scope) {
              uniqueScopes.add(item.Scope);
            }
          });
          return Array.from(uniqueScopes);
        },
        catch: (error) => error,
      }),
    ),
  );

  if (Either.isLeft(loaded)) {
    const error = loaded.left;
    writeConfigDiagnostic(`Failed to load ${label} scopes: ${getErrorMessage(error)}`);
    // Return a minimal set of core scopes as fallback
    return ['https://api.ebay.com/oauth/api_scope'];
  }

  return loaded.right;
};

/**
 * Loads and parses production scopes from the checked-in eBay scope table.
 */
const getProductionScopes = (): string[] => loadScopes('production_scopes.json', 'production');

/**
 * Loads and parses sandbox scopes from the checked-in eBay scope table.
 */
const getSandboxScopes = (): string[] => loadScopes('sandbox_scopes.json', 'sandbox');

/**
 * Gets every known OAuth scope for the specified eBay environment.
 *
 * @param environment eBay environment whose checked-in scope table should be loaded.
 * @returns Unique OAuth scope URIs for the selected environment.
 * @example
 * ```ts
 * const scopes = getAvailableScopes('production');
 * ```
 */
export const getAvailableScopes = (environment: EbayEnvironment): string[] => {
  if (environment === 'production') {
    return getProductionScopes();
  }

  return getSandboxScopes();
};

/**
 * Drops readonly scopes whose view-and-manage counterpart is also present.
 *
 * eBay documents these as redundant pairs: requesting `sell.inventory` already
 * covers the read access represented by `sell.inventory.readonly`, so requesting
 * both only inflates the consent screen.
 *
 * @param scopes OAuth scope URIs to filter.
 * @returns Scopes with redundant `.readonly` variants removed.
 * @example
 * ```ts
 * const scopes = pruneRedundantReadonlyScopes(getAvailableScopes('production'));
 * ```
 */
export const pruneRedundantReadonlyScopes = (scopes: string[]): string[] => {
  const scopeSet = new Set(scopes);

  return scopes.filter((scope) => {
    if (!scope.endsWith('.readonly')) {
      return true;
    }

    const writeScope = scope.slice(0, -'.readonly'.length);
    return !scopeSet.has(writeScope);
  });
};

/**
 * Gets the default OAuth scopes requested for the specified eBay environment.
 *
 * @param environment eBay environment whose checked-in scope table should be loaded.
 * @returns Available scope URIs with redundant readonly variants pruned.
 * @example
 * ```ts
 * const scopes = getDefaultScopes('production');
 * ```
 */
export const getDefaultScopes = (environment: EbayEnvironment): string[] =>
  pruneRedundantReadonlyScopes(getAvailableScopes(environment));

/**
 * Validates requested scopes against the selected eBay environment.
 *
 * @param scopes OAuth scopes requested by a token-management call or setup flow.
 * @param environment eBay environment to validate against.
 * @returns Requested scopes plus warnings for environment-only or unknown scopes.
 * @example
 * ```ts
 * const result = validateScopes(scopes, 'sandbox');
 * ```
 */
export const validateScopes = (
  scopes: string[],
  environment: EbayEnvironment,
): ScopeValidationResult => {
  const validScopes = getAvailableScopes(environment);
  const validScopeSet = new Set(validScopes);
  const warnings: string[] = [];
  const requestedValidScopes: string[] = [];

  scopes.forEach((scope) => {
    if (validScopeSet.has(scope)) {
      requestedValidScopes.push(scope);
    } else {
      // Check if this is a scope for the other environment
      const otherEnvironment = environment === 'production' ? 'sandbox' : 'production';
      const otherScopes = getAvailableScopes(otherEnvironment);

      if (otherScopes.includes(scope)) {
        warnings.push(
          `Scope "${scope}" is only available in ${otherEnvironment} environment, not in ${environment}. This scope will be requested but may be rejected by eBay.`,
        );
      } else {
        warnings.push(
          `Scope "${scope}" is not recognized for ${environment} environment. This scope will be requested but may be rejected by eBay.`,
        );
      }
      // Still include it in case it's a new scope not in our JSON files
      requestedValidScopes.push(scope);
    }
  });

  return { warnings, validScopes: requestedValidScopes };
};

/**
 * Validates environment configuration on startup.
 *
 * @returns Startup validation result consumed by server entrypoints and diagnostics.
 * @example
 * ```ts
 * const validation = validateEnvironmentConfig();
 * ```
 */
export const validateEnvironmentConfig = (): EnvironmentValidationResult => {
  const proxyAuth = getProxyAuthConfig();
  const warnings: string[] = [...proxyAuth.warnings];
  const errors: string[] = [...proxyAuth.errors];

  // Client credentials are required only when this server authenticates to eBay
  // itself. In proxy auth mode (EBAY_MCP_DISABLE_AUTH_HEADER=true) the upstream
  // proxy supplies authentication, so missing credentials are expected, not errors.
  if (!proxyAuth.disableAuthHeader) {
    if (!process.env.EBAY_CLIENT_ID) {
      errors.push('EBAY_CLIENT_ID is not set. OAuth will not work.');
    }

    if (!process.env.EBAY_CLIENT_SECRET) {
      errors.push('EBAY_CLIENT_SECRET is not set. OAuth will not work.');
    }
  }

  // Validate EBAY_ENVIRONMENT
  const environment = process.env.EBAY_ENVIRONMENT;
  if (environment && environment !== 'production' && environment !== 'sandbox') {
    errors.push(`EBAY_ENVIRONMENT must be either "production" or "sandbox", got: "${environment}"`);
  }

  // Check if environment is set
  if (!environment) {
    warnings.push(
      'EBAY_ENVIRONMENT not set. Defaulting to "sandbox". Set EBAY_ENVIRONMENT=production for production use.',
    );
  }

  // Check if redirect URI is set (needed for OAuth user flow)
  if (!process.env.EBAY_REDIRECT_URI) {
    warnings.push(
      'EBAY_REDIRECT_URI is not set. User OAuth flow will not work. Set this to enable user token generation.',
    );
  }

  // Validate EBAY_MCP_TOOLS (all | dynamic | comma-separated family list)
  const toolGatingError = getToolGatingConfigError();
  if (toolGatingError) {
    errors.push(toolGatingError);
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    warnings,
    errors,
    infos: proxyAuth.infos,
  };
};

/**
 * Build EbayConfig from environment variables with safe defaults.
 *
 * @returns Runtime eBay API configuration derived from environment variables.
 * @example
 * ```ts
 * const config = getEbayConfig();
 * ```
 */
export const getEbayConfig = (): EbayConfig => {
  const clientId = process.env.EBAY_CLIENT_ID ?? '';
  const clientSecret = process.env.EBAY_CLIENT_SECRET ?? '';
  const environment = process.env.EBAY_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  const accessToken = process.env.EBAY_USER_ACCESS_TOKEN ?? '';
  const refreshToken = process.env.EBAY_USER_REFRESH_TOKEN ?? '';
  const appAccessToken = process.env.EBAY_APP_ACCESS_TOKEN ?? '';
  const marketplaceId = (process.env.EBAY_MARKETPLACE_ID ?? '').trim() || 'EBAY_US';
  const contentLanguage = (process.env.EBAY_CONTENT_LANGUAGE ?? '').trim() || 'en-US';
  const { apiBaseUrl, disableAuthHeader } = getProxyAuthConfig();

  // Only require client credentials when this server authenticates to eBay itself.
  // In proxy auth mode the upstream proxy supplies auth, so absent credentials are
  // expected and must not nag (tokens can otherwise be generated from a refresh token).
  if (!disableAuthHeader && (clientId === '' || clientSecret === '')) {
    writeConfigDiagnostic(
      'Missing required eBay credentials. Please set:\n1) EBAY_CLIENT_ID\n2) EBAY_CLIENT_SECRET\nin your .env file at project root',
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: process.env.EBAY_REDIRECT_URI,
    marketplaceId,
    contentLanguage,
    environment,
    accessToken,
    refreshToken,
    appAccessToken,
    apiBaseUrl,
    disableAuthHeader,
  };
};

/**
 * Get base URL for Commerce Media API image operations (uses apim subdomain).
 *
 * @param environment eBay environment used when no override is configured.
 * @param overrideBaseUrl Base URL override from `EBAY_MCP_API_BASE_URL`.
 * @returns Media API base URL for direct eBay or proxy traffic.
 * @example
 * ```ts
 * const mediaBaseUrl = getMediaBaseUrl('production');
 * ```
 */
export const getMediaBaseUrl = (environment: EbayEnvironment, overrideBaseUrl?: string): string => {
  if (overrideBaseUrl) {
    return overrideBaseUrl;
  }
  return environment === 'production' ? 'https://apim.ebay.com' : 'https://apim.sandbox.ebay.com';
};

/**
 * Get the eBay REST API base URL for the configured environment.
 *
 * @param environment eBay environment used when no override is configured.
 * @param overrideBaseUrl Base URL override from `EBAY_MCP_API_BASE_URL`.
 * @returns REST API base URL for direct eBay or proxy traffic.
 * @example
 * ```ts
 * const baseUrl = getBaseUrl('sandbox');
 * ```
 */
export const getBaseUrl = (environment: EbayEnvironment, overrideBaseUrl?: string): string => {
  if (overrideBaseUrl) {
    return overrideBaseUrl;
  }
  return environment === 'production' ? 'https://api.ebay.com' : 'https://api.sandbox.ebay.com';
};

/**
 * Get base URL for Identity API (uses apiz subdomain).
 *
 * @param environment eBay environment used when no override is configured.
 * @param overrideBaseUrl Base URL override from `EBAY_MCP_API_BASE_URL`.
 * @returns Identity API base URL for direct eBay or proxy traffic.
 * @example
 * ```ts
 * const identityBaseUrl = getIdentityBaseUrl('production');
 * ```
 */
export const getIdentityBaseUrl = (
  environment: EbayEnvironment,
  overrideBaseUrl?: string,
): string => {
  if (overrideBaseUrl) {
    return overrideBaseUrl;
  }
  return environment === 'production' ? 'https://apiz.ebay.com' : 'https://apiz.sandbox.ebay.com';
};

/** Hosts treated as loopback when deciding whether a cleartext base URL is safe. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

/**
 * Parsed and validated proxy/runtime auth overrides sourced from the `EBAY_MCP_*`
 * environment variables. Lets the server run behind an authenticating reverse
 * proxy: when {@link disableAuthHeader} is set the server attaches no eBay auth and
 * skips token acquisition, and {@link apiBaseUrl} redirects all outbound eBay
 * traffic to the proxy origin. `warnings`/`errors`/`infos` are surfaced through
 * {@link validateEnvironmentConfig} so startup and `npm run diagnose` report
 * misconfigurations consistently.
 *
 * @see https://github.com/YosefHayim/ebay-mcp/issues/122
 */
export interface ProxyAuthConfig {
  /** Normalized base-URL override (trailing slash stripped), or undefined when unset. */
  apiBaseUrl?: string;
  /** Whether all eBay auth headers and token acquisition should be skipped. */
  disableAuthHeader: boolean;
  /** Non-fatal configuration notices (e.g. cleartext credentials, no-op flag). */
  warnings: string[];
  /** Fatal configuration problems (e.g. an unparseable base URL). */
  errors: string[];
  /** Informational startup notices (e.g. proxy auth mode active). */
  infos: string[];
}

/**
 * Parse, normalize, and validate the proxy auth overrides from the environment.
 *
 * Normalization strips a trailing slash from the base URL so path concatenation
 * (`${base}${'/sell/...'}`) never yields a double slash. An unparseable URL is a
 * fatal error (fail loud at the boundary) rather than a silent fallback to
 * `api.ebay.com`. Two non-fatal warnings guard the footguns: disabling auth without
 * a base URL (requests would hit real eBay unauthenticated), and pointing the base
 * URL at a plaintext `http://` non-loopback host while auth is still on (real eBay
 * tokens would traverse the wire in cleartext).
 *
 * @returns Parsed proxy auth configuration and startup diagnostics.
 * @example
 * ```ts
 * const proxyAuth = getProxyAuthConfig();
 * ```
 */
export const getProxyAuthConfig = (): ProxyAuthConfig => {
  const disableAuthHeader = process.env.EBAY_MCP_DISABLE_AUTH_HEADER === 'true';
  const rawBaseUrl = (process.env.EBAY_MCP_API_BASE_URL ?? '').trim();
  const warnings: string[] = [];
  const errors: string[] = [];
  const infos: string[] = [];

  let apiBaseUrl: string | undefined;
  let parsedBaseUrl: URL | undefined;
  if (rawBaseUrl) {
    const parsed = Effect.runSync(
      Effect.either(
        Effect.try({
          try: () => new URL(rawBaseUrl),
          catch: (error) => error,
        }),
      ),
    );

    if (Either.isRight(parsed)) {
      parsedBaseUrl = parsed.right;
      apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    } else {
      errors.push(
        `EBAY_MCP_API_BASE_URL is not a valid URL: "${rawBaseUrl}". ` +
          'Provide an absolute URL such as "http://localhost:8080".',
      );
    }
  }

  if (disableAuthHeader) {
    infos.push(
      'Proxy auth mode enabled (EBAY_MCP_DISABLE_AUTH_HEADER=true): eBay credentials are not required; ' +
        'authentication is delegated to the upstream proxy.',
    );
    if (!apiBaseUrl) {
      warnings.push(
        'EBAY_MCP_DISABLE_AUTH_HEADER=true but EBAY_MCP_API_BASE_URL is not set. Requests will be sent ' +
          'to eBay directly without authentication and will fail. Set EBAY_MCP_API_BASE_URL to your proxy.',
      );
    }
  }

  if (
    parsedBaseUrl &&
    !disableAuthHeader &&
    parsedBaseUrl.protocol === 'http:' &&
    !LOOPBACK_HOSTS.has(parsedBaseUrl.hostname)
  ) {
    warnings.push(
      `EBAY_MCP_API_BASE_URL points at a plaintext http:// host (${parsedBaseUrl.host}) while authentication ` +
        'is enabled. eBay access tokens will be transmitted unencrypted. Use https://, a loopback address, ' +
        'or set EBAY_MCP_DISABLE_AUTH_HEADER=true.',
    );
  }

  return { apiBaseUrl, disableAuthHeader, warnings, errors, infos };
};

/**
 * Generate the OAuth authorization URL for user consent
 * This URL should be opened in a browser for the user to grant permissions
 *
 * Note: Scopes are optional - eBay will automatically grant the appropriate scopes
 * based on your application's keyset configuration if scopes are not specified.
 *
 * @param clientId eBay application client ID.
 * @param redirectUri eBay RuName redirect value, not a localhost URL.
 * @param environment eBay environment that should host the authorization page.
 * @param scopes OAuth scopes to request; defaults to the selected environment scopes.
 * @param state Opaque CSRF value returned by eBay to the redirect URI.
 * @returns Fully qualified OAuth authorization URL for user consent.
 * @example
 * ```ts
 * const url = getOAuthAuthorizationUrl(clientId, ruName, 'sandbox');
 * ```
 */
export const getOAuthAuthorizationUrl = (
  clientId: string,
  redirectUri: string, // MUST be eBay RuName, NOT a URL
  environment: EbayEnvironment,
  scopes?: string[],
  state?: string,
): string => {
  const authBase =
    environment === 'production' ? 'https://auth.ebay.com' : 'https://auth.sandbox.ebay.com';

  let scopeList: string;
  if (scopes && scopes.length > 0) {
    scopeList = scopes.join('%20');
  } else {
    const defaultScopes = getDefaultScopes(environment);
    scopeList = defaultScopes.join('%20');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    ...(state ? { state } : {}),
  });

  return `${authBase}/oauth2/authorize?${params.toString()}&scope=${scopeList}`;
};

const iconUrl = (size: string): string => {
  const url = new URL(`../../public/icons/${size}.png`, import.meta.url);
  const path = fileURLToPath(url);
  if (!existsSync(path)) {
    writeConfigDiagnostic(
      `Icon not found at ${path}. Ensure public/icons is included in the package.`,
    );
  }
  return url.toString();
};

/**
 * MCP server implementation metadata advertised to clients.
 */
export const mcpConfig: Implementation = {
  name: 'eBay API Model Context Protocol Server',
  version: getVersion(),
  title: 'eBay API Model Context Protocol Server',
  websiteUrl: 'https://github.com/YosefHayim/ebay-mcp',
  icons: [
    {
      src: iconUrl('16x16'),
      mimeType: 'image/png',
      sizes: ['16x16'],
    },
    {
      src: iconUrl('32x32'),
      mimeType: 'image/png',
      sizes: ['32x32'],
    },
    {
      src: iconUrl('48x48'),
      mimeType: 'image/png',
      sizes: ['48x48'],
    },
    {
      src: iconUrl('128x128'),
      mimeType: 'image/png',
      sizes: ['128x128'],
    },
    {
      src: iconUrl('256x256'),
      mimeType: 'image/png',
      sizes: ['256x256'],
    },
    {
      src: iconUrl('512x512'),
      mimeType: 'image/png',
      sizes: ['512x512'],
    },
    {
      src: iconUrl('1024x1024'),
      mimeType: 'image/png',
      sizes: ['1024x1024'],
    },
  ],
};
