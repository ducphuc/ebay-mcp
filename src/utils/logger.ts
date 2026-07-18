import winston from 'winston';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { getLoggingConfig } from '@/config/environment.js';

/**
 * Log directory for eBay MCP Server
 * Stored in user's home directory under .ebay-mcp/logs
 */
const LOG_DIR = join(homedir(), '.ebay-mcp', 'logs');
const loggingConfig = getLoggingConfig();

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log level from environment variable or default to 'info'
 * Levels: error, warn, info, http, verbose, debug, silly
 */
const LOG_LEVEL = loggingConfig.logLevel;

/**
 * Whether to enable file logging (disabled in production MCP mode by default)
 */
let fileLoggingEnabled = loggingConfig.enableFileLogging;

/**
 * Custom log format with timestamp and colored output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    const stackStr = typeof stack === 'string' ? `\n${stack}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}${stackStr}`;
  }),
);

/**
 * File format (no colors, JSON for easier parsing)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Create Winston logger transports
 */
const transports: winston.transport[] = [
  // Console transport - always enabled for MCP stderr output
  new winston.transports.Console({
    format: consoleFormat,
    stderrLevels: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
  }),
];

// Add file transports if enabled
if (fileLoggingEnabled) {
  transports.push(
    // Error log - only errors
    new winston.transports.File({
      filename: join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
    // Combined log - all levels
    new winston.transports.File({
      filename: join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    // Debug log - verbose and debug messages
    new winston.transports.File({
      filename: join(LOG_DIR, 'debug.log'),
      level: 'debug',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
      tailable: true,
    }),
  );
}

/**
 * Main Winston logger instance
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports,
  exitOnError: false,
});

/**
 * Logger interface for different components
 */
export interface ComponentLogger {
  /** Logs an error-level message to stderr/file transports. */
  error: (message: string, meta?: Record<string, unknown>) => void;
  /** Logs a warning-level message to stderr/file transports. */
  warn: (message: string, meta?: Record<string, unknown>) => void;
  /** Logs an info-level message to stderr/file transports. */
  info: (message: string, meta?: Record<string, unknown>) => void;
  /** Logs an HTTP-level message to stderr/file transports. */
  http: (message: string, meta?: Record<string, unknown>) => void;
  /** Logs a debug-level message to stderr/file transports. */
  debug: (message: string, meta?: Record<string, unknown>) => void;
  /** Logs a verbose-level message to stderr/file transports. */
  verbose: (message: string, meta?: Record<string, unknown>) => void;
}

/** Log file paths exposed for diagnostics. */
export interface LogPaths {
  /** Directory that contains all log files. */
  logDir: string;
  /** Error-only log file path. */
  errorLog: string;
  /** Combined log file path. */
  combinedLog: string;
  /** Debug log file path. */
  debugLog: string;
}

/**
 * Create a child logger for a specific component
 *
 * @param component - Component label prefixed to every emitted message.
 * @returns Component-scoped logger methods.
 *
 * @example
 * ```ts
 * const logger = createLogger('API');
 * logger.info('Ready');
 * ```
 */
export const createLogger = (component: string): ComponentLogger => ({
  error: (message: string, meta?: Record<string, unknown>) => {
    logger.error(`[${component}] ${message}`, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(`[${component}] ${message}`, meta);
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    logger.info(`[${component}] ${message}`, meta);
  },
  http: (message: string, meta?: Record<string, unknown>) => {
    logger.http(`[${component}] ${message}`, meta);
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    logger.debug(`[${component}] ${message}`, meta);
  },
  verbose: (message: string, meta?: Record<string, unknown>) => {
    logger.verbose(`[${component}] ${message}`, meta);
  },
});

/**
 * Pre-configured loggers for different components
 */
/** Logger for server lifecycle events. */
export const serverLogger = createLogger('Server');
/** Logger for outbound eBay API calls. */
export const apiLogger = createLogger('API');
/** Logger for OAuth and token operations. */
export const authLogger = createLogger('Auth');
/** Logger for MCP tool execution. */
export const toolLogger = createLogger('Tool');
/** Logger for setup wizard output. */
export const setupLogger = createLogger('Setup');

/**
 * Log HTTP request details
 *
 * @param method - HTTP method being sent.
 * @param url - Request URL.
 * @param params - Optional query parameters.
 * @param body - Optional request body.
 * @returns Nothing; writes to configured logger transports.
 *
 * @example
 * ```ts
 * logRequest('GET', url, params);
 * ```
 */
export const logRequest = (
  method: string,
  url: string,
  params?: Record<string, unknown>,
  body?: unknown,
): void => {
  if (!logger.isLevelEnabled('http')) {
    return;
  }

  apiLogger.http(`Request: ${method.toUpperCase()} ${url}`, {
    params: params && Object.keys(params).length > 0 ? params : undefined,
    body: body ? summarizeLogData(body) : undefined,
  });
};

/**
 * Log HTTP response details
 *
 * @param status - HTTP response status code.
 * @param statusText - HTTP response status text.
 * @param data - Optional response payload.
 * @param rateLimitRemaining - Optional remaining request quota.
 * @param rateLimitTotal - Optional total request quota.
 * @returns Nothing; writes to configured logger transports.
 *
 * @example
 * ```ts
 * logResponse(200, 'OK', data);
 * ```
 */
export const logResponse = (
  status: number,
  statusText: string,
  data?: unknown,
  rateLimitRemaining?: string,
  rateLimitTotal?: string,
): void => {
  if (!logger.isLevelEnabled('http')) {
    return;
  }

  const meta: Record<string, unknown> = {};

  if (rateLimitRemaining && rateLimitTotal) {
    meta.rateLimit = `${rateLimitRemaining}/${rateLimitTotal}`;
  }

  if (data) {
    meta.data = summarizeLogData(data);
  }

  apiLogger.http(`Response: ${status} ${statusText}`, meta);
};

/**
 * Log HTTP error response
 *
 * @param status - HTTP status code, when a response exists.
 * @param statusText - HTTP status text, when a response exists.
 * @param url - Request URL that failed.
 * @param errorData - Optional parsed error payload.
 * @returns Nothing; writes to configured logger transports.
 *
 * @example
 * ```ts
 * logErrorResponse(error.status, error.statusText, url, error.data);
 * ```
 */
export const logErrorResponse = (
  status: number | undefined,
  statusText: string | undefined,
  url: string,
  errorData?: unknown,
): void => {
  if (!logger.isLevelEnabled('error')) {
    return;
  }

  const statusLabel = status === undefined ? 'No status' : String(status);
  const statusTextLabel = statusText ?? 'No response';
  apiLogger.error(`Error Response: ${statusLabel} ${statusTextLabel}`, {
    url,
    error: errorData ? summarizeLogData(errorData) : undefined,
  });
};

/**
 * Convert data to a bounded, JSON-safe log representation without exposing binary bytes.
 */
export const summarizeLogData = (data: unknown, maxLength = 1000): unknown => {
  const seen = new WeakSet<object>();
  const limit = Math.max(64, maxLength);

  const visit = (value: unknown, depth: number): unknown => {
    if (Buffer.isBuffer(value)) {
      return { type: 'Buffer', byteLength: value.byteLength };
    }
    if (value instanceof ArrayBuffer) {
      return { type: 'ArrayBuffer', byteLength: value.byteLength };
    }
    if (ArrayBuffer.isView(value)) {
      return { type: value.constructor.name, byteLength: value.byteLength };
    }
    if (typeof value === 'string') {
      return value.length > limit ? `${value.slice(0, limit)}... [truncated]` : value;
    }
    if (typeof value === 'bigint') {
      return `${value.toString()}n`;
    }
    if (typeof value === 'symbol' || typeof value === 'function') {
      return String(value);
    }
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
    }
    if (value instanceof Error) {
      return { name: value.name, message: visit(value.message, depth + 1) };
    }
    if (seen.has(value)) {
      return '[Circular]';
    }
    if (depth >= 6) {
      return '[Max depth]';
    }

    seen.add(value);
    if (Array.isArray(value)) {
      const items = value.slice(0, 50).map((item) => visit(item, depth + 1));
      if (value.length > 50) items.push(`[${value.length - 50} more items]`);
      return items;
    }

    const entries = Object.entries(Object.getOwnPropertyDescriptors(value));
    const summarized = Object.fromEntries(
      entries
        .slice(0, 50)
        .map(([key, descriptor]) => [
          key,
          'value' in descriptor ? visit(descriptor.value, depth + 1) : '[Accessor omitted]',
        ]),
    );
    if (entries.length > 50) summarized['[truncatedKeys]'] = entries.length - 50;
    return summarized;
  };

  try {
    const summarized = visit(data, 0);
    const str = JSON.stringify(summarized);
    if (str === undefined || str.length <= limit) {
      return summarized;
    }
    return `${str.substring(0, limit)}... [truncated]`;
  } catch (error) {
    return `[Unserializable log data: ${error instanceof Error ? error.name : 'unknown error'}]`;
  }
};

/**
 * Get log file paths for user reference
 *
 * @returns Paths to the log directory and known log files.
 *
 * @example
 * ```ts
 * const paths = getLogPaths();
 * ```
 */
export const getLogPaths = (): LogPaths => ({
  logDir: LOG_DIR,
  errorLog: join(LOG_DIR, 'error.log'),
  combinedLog: join(LOG_DIR, 'combined.log'),
  debugLog: join(LOG_DIR, 'debug.log'),
});

/**
 * Reports whether file logging is currently enabled.
 *
 * @returns True when Winston file transports are enabled.
 *
 * @example
 * ```ts
 * if (isFileLoggingEnabled()) {
 *   serverLogger.info('File logging enabled');
 * }
 * ```
 */
export const isFileLoggingEnabled = (): boolean => fileLoggingEnabled;

/**
 * Enable or disable file logging at runtime
 *
 * @param enabled - Whether file logging should be enabled.
 * @returns Nothing; mutates Winston transports when enabling.
 *
 * @example
 * ```ts
 * setFileLogging(true);
 * ```
 */
export const setFileLogging = (enabled: boolean): void => {
  if (enabled && !fileLoggingEnabled) {
    logger.add(
      new winston.transports.File({
        filename: join(LOG_DIR, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
        tailable: true,
      }),
    );
    logger.add(
      new winston.transports.File({
        filename: join(LOG_DIR, 'combined.log'),
        format: fileFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
        tailable: true,
      }),
    );
    fileLoggingEnabled = true;
    logger.info('File logging enabled');
  }
};

/**
 * Set log level at runtime
 *
 * @param level - Winston log level name.
 * @returns Nothing; mutates the shared Winston logger level.
 *
 * @example
 * ```ts
 * setLogLevel('debug');
 * ```
 */
export const setLogLevel = (level: string): void => {
  logger.level = level;
  logger.info(`Log level set to: ${level}`);
};
