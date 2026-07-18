import {
  areLogisticsToolsExposed,
  buildDiagnosticTokenSummary,
} from '@/scripts/diagnosticTokenInfo.js';
import { LOGISTICS_OAUTH_SCOPE } from '@/config/logistics.js';
import { describe, expect, it } from 'vitest';

describe('diagnostic token report safety', () => {
  it('exports booleans and initialized token scopes without copying credentials', () => {
    const env = {
      EBAY_MCP_TOOLS: 'logistics',
      EBAY_CLIENT_SECRET: 'client-secret-value',
      EBAY_USER_REFRESH_TOKEN: 'refresh-token-value',
      EBAY_USER_ACCESS_TOKEN: 'access-token-value',
      EBAY_APP_ACCESS_TOKEN: 'app-token-value',
    };
    const summary = buildDiagnosticTokenSummary(env, {
      tokenScopes: ['https://api.ebay.com/oauth/api_scope'],
      environmentScopes: [],
      missingScopes: [],
    });
    const exported = JSON.stringify(summary);

    expect(summary).toMatchObject({
      hasUserToken: true,
      hasAppToken: true,
      missingLogisticsScope: true,
    });
    expect(exported).not.toContain('client-secret-value');
    expect(exported).not.toContain('refresh-token-value');
    expect(exported).not.toContain('access-token-value');
    expect(exported).not.toContain('app-token-value');
  });

  it('reports Logistics permission non-fatally only when that family can be exposed', () => {
    expect(areLogisticsToolsExposed({ EBAY_MCP_TOOLS: 'inventory' })).toBe(false);
    expect(areLogisticsToolsExposed({ EBAY_MCP_TOOLS: 'dynamic' })).toBe(true);
    expect(
      buildDiagnosticTokenSummary(
        { EBAY_MCP_TOOLS: 'logistics' },
        {
          tokenScopes: [LOGISTICS_OAUTH_SCOPE],
          environmentScopes: [],
          missingScopes: [],
        },
      ).missingLogisticsScope,
    ).toBe(false);
  });
});
