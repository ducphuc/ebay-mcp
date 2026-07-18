import type { OAuthTokenScopeInfo } from '@/auth/oauth.js';
import { LOGISTICS_OAUTH_SCOPE } from '@/config/logistics.js';
import { resolveToolGatingMode } from '@/config/toolFamilies.js';

/** Secret-free token fields safe to include in an exported diagnostic report. */
export interface DiagnosticTokenSummary {
  readonly hasUserToken: boolean;
  readonly hasAppToken: boolean;
  readonly scopes?: string[];
  readonly missingLogisticsScope?: boolean;
}

/** Whether the selected tool-gating mode can expose Logistics tools. */
export const areLogisticsToolsExposed = (env: NodeJS.ProcessEnv): boolean => {
  const mode = resolveToolGatingMode(env);
  return mode.kind !== 'static' || mode.families.includes('logistics');
};

/** Build an export-safe token summary without copying any credential-derived strings. */
export const buildDiagnosticTokenSummary = (
  env: NodeJS.ProcessEnv,
  scopeInfo: OAuthTokenScopeInfo | undefined,
): DiagnosticTokenSummary => ({
  hasUserToken: Boolean(env.EBAY_USER_REFRESH_TOKEN || env.EBAY_USER_ACCESS_TOKEN),
  hasAppToken: Boolean(env.EBAY_APP_ACCESS_TOKEN),
  ...(scopeInfo ? { scopes: [...scopeInfo.tokenScopes] } : {}),
  ...(areLogisticsToolsExposed(env) && scopeInfo
    ? { missingLogisticsScope: !scopeInfo.tokenScopes.includes(LOGISTICS_OAUTH_SCOPE) }
    : {}),
});
