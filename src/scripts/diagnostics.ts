/**
 * Diagnostics Script - Troubleshooting and system health checks
 *
 * Usage:
 *   npm run diagnose
 *   npx ebay-mcp --diagnose
 */

import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runSecurityChecks, displaySecurityResults } from '@/utils/securityChecker.js';
import { getEbayEnvPathForProject } from '@/config/envPath.js';
import { validateSetup, displayRecommendations } from '@/utils/setupValidator.js';
import { parseEnvFile } from '@/utils/envParser.js';
import { detectLLMClients } from '@/utils/llmClientDetector.js';
import { displayScopeVerification } from '@/utils/scopeHelper.js';
import { readEnvironment } from './setupShared.js';
import { EbaySellerApi } from '@/api/index.js';
import type { OAuthTokenScopeInfo } from '@/auth/oauth.js';
import { LOGISTICS_OAUTH_SCOPE } from '@/config/logistics.js';
import {
  areLogisticsToolsExposed,
  buildDiagnosticTokenSummary,
  type DiagnosticTokenSummary,
} from './diagnosticTokenInfo.js';
import { getErrorMessage } from '@/utils/errors.js';
import { getUpdateInfo, getVersion } from '@/utils/version.js';
import type { EbayConfig } from '@/types/ebay.js';
import { Effect, Either } from 'effect';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

interface DiagnosticReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  security: unknown[];
  configuration: unknown;
  llmClients: unknown[];
  apiConnection: {
    canReachEbay: boolean;
    error?: string;
  };
  tokenInfo?: DiagnosticTokenSummary;
}

const createDiagnosticConfig = (envVars: Record<string, string>): EbayConfig => ({
  clientId: envVars.EBAY_CLIENT_ID,
  clientSecret: envVars.EBAY_CLIENT_SECRET,
  redirectUri: envVars.EBAY_REDIRECT_URI,
  environment: readEnvironment(envVars.EBAY_ENVIRONMENT),
  marketplaceId: envVars.EBAY_MARKETPLACE_ID,
  contentLanguage: envVars.EBAY_CONTENT_LANGUAGE,
  refreshToken: envVars.EBAY_USER_REFRESH_TOKEN,
  accessToken: envVars.EBAY_USER_ACCESS_TOKEN,
  appAccessToken: envVars.EBAY_APP_ACCESS_TOKEN,
});

const readInitializedScopeInfo = async (
  config: EbayConfig,
): Promise<OAuthTokenScopeInfo | undefined> => {
  const tokenInfo = await Effect.runPromise(
    Effect.either(
      Effect.gen(function* () {
        const api = new EbaySellerApi(config);
        yield* api.initialize();
        return api.getAuthClient().getTokenInfo();
      }),
    ),
  );

  return Either.isRight(tokenInfo) ? tokenInfo.right.scopeInfo : undefined;
};

/**
 * Check API connectivity
 */
async function checkApiConnectivity(): Promise<{ canReachEbay: boolean; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const checked = await Effect.runPromise(
    Effect.either(
      Effect.tryPromise({
        try: () =>
          fetch('https://api.ebay.com/health', {
            signal: controller.signal,
          }),
        catch: (error) => error,
      }).pipe(Effect.ensuring(Effect.sync(() => clearTimeout(timeout)))),
    ),
  );

  if (Either.isLeft(checked)) {
    return {
      canReachEbay: false,
      error: getErrorMessage(checked.left),
    };
  }

  return { canReachEbay: checked.right.ok || checked.right.status === 404 };
}

/**
 * Test eBay API authentication
 */
async function testEbayAuthentication(
  config: EbayConfig,
): Promise<{ success: boolean; error?: string; userInfo?: unknown }> {
  const authenticated = await Effect.runPromise(
    Effect.either(
      Effect.gen(function* () {
        const api = new EbaySellerApi(config);
        yield* api.initialize();

        // Try to get user info
        return yield* api.identity.getUser();
      }),
    ),
  );

  if (Either.isLeft(authenticated)) {
    return {
      success: false,
      error: getErrorMessage(authenticated.left),
    };
  }

  return { success: true, userInfo: authenticated.right };
}

/**
 * Display diagnostic header
 */
function displayHeader(): void {
  console.clear();
  console.log(
    chalk.bold.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              eBay MCP Server Diagnostics                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `),
  );
  console.log(chalk.gray(`Run date: ${new Date().toISOString()}\n`));
}

/**
 * Display system information
 */
function displaySystemInfo(): void {
  console.log(chalk.bold.cyan('💻 System Information\n'));
  console.log(`  ${chalk.gray('Node.js:')} ${process.version}`);
  console.log(`  ${chalk.gray('Platform:')} ${process.platform}`);
  console.log(`  ${chalk.gray('Architecture:')} ${process.arch}`);
  console.log(`  ${chalk.gray('CWD:')} ${process.cwd()}`);
  console.log('');
}

/**
 * Check npm for a newer published version and surface it. `diagnose` is an
 * intentional, interactive command run by the user, so a live registry fetch is
 * appropriate here (unlike the server hot path, which uses the cached check).
 * A failed fetch (offline) is reported, not thrown — diagnostics should never
 * abort on a best-effort network call.
 */
async function displayUpdateStatus(): Promise<void> {
  console.log(chalk.bold.cyan('🔄 Version\n'));
  console.log(`  ${chalk.gray('Installed:')} ${getVersion()}`);

  const updateInfo = await Effect.runPromise(
    Effect.either(
      Effect.tryPromise({
        try: getUpdateInfo,
        catch: (error) => error,
      }),
    ),
  );

  if (Either.isLeft(updateInfo)) {
    console.log(
      `  ${chalk.gray('Latest:')}    ${chalk.dim('update check unavailable (offline?)')}`,
    );
  } else if (updateInfo.right) {
    console.log(
      `  ${chalk.gray('Latest:')}    ${chalk.green(updateInfo.right.latest)} ${chalk.yellow(`(run \`npm i -g ${updateInfo.right.name}\` to update)`)}`,
    );
  } else {
    console.log(`  ${chalk.gray('Latest:')}    ${chalk.green('up to date')}`);
  }

  console.log('');
}

/**
 * Display configuration status
 */
function displayConfigurationStatus(envVars: Record<string, string>): void {
  console.log(chalk.bold.cyan('⚙️  Configuration Status\n'));

  const checks = [
    { key: 'EBAY_CLIENT_ID', label: 'Client ID', redact: true },
    { key: 'EBAY_CLIENT_SECRET', label: 'Client Secret', redact: true },
    { key: 'EBAY_REDIRECT_URI', label: 'Redirect URI', redact: false },
    { key: 'EBAY_ENVIRONMENT', label: 'Environment', redact: false },
    { key: 'EBAY_MARKETPLACE_ID', label: 'Marketplace ID', redact: false },
    { key: 'EBAY_CONTENT_LANGUAGE', label: 'Content Language', redact: false },
    { key: 'EBAY_USER_REFRESH_TOKEN', label: 'User Refresh Token', redact: true },
    { key: 'EBAY_USER_ACCESS_TOKEN', label: 'User Access Token', redact: true },
    { key: 'EBAY_APP_ACCESS_TOKEN', label: 'App Access Token', redact: true },
  ];

  for (const check of checks) {
    const value = envVars[check.key];
    let status: string;
    let displayValue: string;

    if (value && value.trim() && !value.includes('_here')) {
      status = chalk.green('✓ Set');
      displayValue = check.redact ? `${value.substring(0, 10)}...` : value;
    } else {
      status = chalk.red('✗ Not set');
      displayValue = chalk.gray('(not configured)');
    }

    console.log(`  ${status} ${chalk.bold(check.label)}: ${displayValue}`);
  }

  console.log('');
}

/**
 * Display LLM client status
 */
function displayLLMClientStatus(): void {
  console.log(chalk.bold.cyan('🤖 LLM Client Detection\n'));

  const clients = detectLLMClients();

  for (const client of clients) {
    const detected = client.detected ? chalk.green('✓ Detected') : chalk.gray('✗ Not found');
    const configured = client.configExists
      ? chalk.green('[Configured]')
      : chalk.gray('[Not configured]');

    console.log(`  ${detected} ${chalk.bold(client.displayName)} ${configured}`);
    if (client.detected) {
      console.log(chalk.gray(`    Config: ${client.configPath}`));
    }
  }

  console.log('');
}

/**
 * Test API authentication and display results
 */
async function displayAuthenticationTest(config: EbayConfig): Promise<void> {
  console.log(chalk.bold.cyan('🔐 API Authentication Test\n'));

  const result = await testEbayAuthentication(config);

  if (result.success) {
    console.log(chalk.green('  ✓ Successfully authenticated with eBay API\n'));

    if (result.userInfo) {
      console.log(chalk.bold.white('  User Information:'));
      console.log(chalk.gray(JSON.stringify(result.userInfo, null, 2)));
      console.log('');
    }
  } else {
    console.log(chalk.red('  ✗ Authentication failed\n'));
    console.log(chalk.yellow(`  Error: ${result.error}\n`));
  }
}

/**
 * Generate diagnostic report
 */
async function generateDiagnosticReport(exportPath?: string): Promise<DiagnosticReport> {
  const envPath = getEbayEnvPathForProject(PROJECT_ROOT);
  const envVars = parseEnvFile(envPath);

  // Run security checks
  const securityResults = await runSecurityChecks(PROJECT_ROOT);

  // Run configuration validation
  const validationSummary = await validateSetup(PROJECT_ROOT);

  // Detect LLM clients
  const llmClients = detectLLMClients();

  // Check API connectivity
  const apiConnection = await checkApiConnectivity();

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    security: securityResults,
    configuration: validationSummary,
    llmClients,
    apiConnection,
  };

  // If we have credentials, test authentication
  if (envVars.EBAY_CLIENT_ID && envVars.EBAY_CLIENT_SECRET) {
    const config = createDiagnosticConfig(envVars);
    const scopeInfo = await readInitializedScopeInfo(config);

    report.tokenInfo = buildDiagnosticTokenSummary({ ...envVars, ...process.env }, scopeInfo);
  }

  // Export report if path provided
  if (exportPath) {
    writeFileSync(exportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(chalk.green(`\n✓ Diagnostic report exported to: ${exportPath}\n`));
  }

  return report;
}

/**
 * Main diagnostics function
 */
async function runDiagnostics(exportReport = false): Promise<void> {
  displayHeader();
  displaySystemInfo();
  await displayUpdateStatus();

  // Security checks
  const securityResults = await runSecurityChecks(PROJECT_ROOT);
  displaySecurityResults(securityResults);

  // Configuration status
  const envPath = getEbayEnvPathForProject(PROJECT_ROOT);
  const envVars = parseEnvFile(envPath);
  displayConfigurationStatus(envVars);

  // LLM client detection
  displayLLMClientStatus();

  // API connectivity
  console.log(chalk.bold.cyan('🌐 API Connectivity\n'));
  const apiConnection = await checkApiConnectivity();

  if (apiConnection.canReachEbay) {
    console.log(chalk.green('  ✓ Can reach eBay API servers\n'));
  } else {
    console.log(chalk.red('  ✗ Cannot reach eBay API servers'));
    console.log(chalk.yellow(`  Error: ${apiConnection.error}\n`));
  }

  // Configuration validation
  console.log(chalk.bold.cyan('📋 Configuration Validation\n'));
  const validationSummary = await validateSetup(PROJECT_ROOT);
  displayRecommendations(validationSummary);

  // If we have credentials, test authentication
  if (envVars.EBAY_CLIENT_ID && envVars.EBAY_CLIENT_SECRET) {
    const config = createDiagnosticConfig(envVars);

    await displayAuthenticationTest(config);

    // Scope verification if user has refresh token
    if (envVars.EBAY_USER_REFRESH_TOKEN) {
      const scopeInfo = await readInitializedScopeInfo(config);

      if (!scopeInfo) {
        console.log(chalk.yellow('⚠️  Could not verify token scopes\n'));
      } else {
        displayScopeVerification(scopeInfo.tokenScopes, config.environment);
        if (
          areLogisticsToolsExposed(process.env) &&
          !scopeInfo.tokenScopes.includes(LOGISTICS_OAUTH_SCOPE)
        ) {
          console.log(
            chalk.yellow(
              '  ⚠ Logistics tools are exposed, but the token lacks sell.logistics permission.\n' +
                '    Re-run setup with --logistics after eBay approves the app for Limited Release.\n',
            ),
          );
        }
      }
    }
  }

  // Export report if requested
  if (exportReport) {
    const reportPath = join(PROJECT_ROOT, `ebay-mcp-diagnostic-${Date.now()}.json`);
    await generateDiagnosticReport(reportPath);
  }

  console.log(chalk.bold.green('✅ Diagnostics complete!\n'));
  console.log(chalk.gray('For more help, visit:'));
  console.log(chalk.blue.underline('  https://github.com/YosefHayim/ebay-mcp#troubleshooting\n'));
}

// CLI handler
const args = process.argv.slice(2);
const exportReport = args.includes('--export') || args.includes('-e');

void Effect.runPromise(
  Effect.either(
    Effect.tryPromise({
      try: () => runDiagnostics(exportReport),
      catch: (error) => error,
    }),
  ),
).then((result) => {
  if (Either.isLeft(result)) {
    console.error(chalk.red('\n❌ Diagnostics failed:'), getErrorMessage(result.left));
    process.exitCode = 1;
  }
});
