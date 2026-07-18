import { apiLogger, logRequest, setLogLevel, summarizeLogData } from '@/utils/logger.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('HTTP log data safety', () => {
  afterEach(() => {
    setLogLevel('info');
    vi.restoreAllMocks();
  });

  it('does no body inspection or serialization when HTTP logging is disabled', () => {
    setLogLevel('info');
    let inspected = false;
    const body = new Proxy(
      {},
      {
        ownKeys: () => {
          inspected = true;
          return [];
        },
      },
    );
    const httpSpy = vi.spyOn(apiLogger, 'http').mockImplementation(() => undefined);

    logRequest('POST', 'https://api.ebay.com/upload', undefined, body);

    expect(inspected).toBe(false);
    expect(httpSpy).not.toHaveBeenCalled();
  });

  it('logs only binary type and byte length when HTTP logging is enabled', () => {
    setLogLevel('http');
    const httpSpy = vi.spyOn(apiLogger, 'http').mockImplementation(() => undefined);
    const bytes = Buffer.from([255, 216, 255, 224, 1, 2, 3, 4]);

    logRequest('POST', 'https://api.ebay.com/upload', undefined, bytes);

    expect(httpSpy).toHaveBeenCalledWith(expect.any(String), {
      params: undefined,
      body: { type: 'Buffer', byteLength: bytes.byteLength },
    });
    expect(JSON.stringify(httpSpy.mock.calls)).not.toContain('255,216,255');
  });

  it('serializes cyclic and unusual values into a bounded safe representation', () => {
    const cyclic: Record<string, unknown> = { big: 1n, bytes: new Uint8Array([1, 2, 3]) };
    cyclic.self = cyclic;

    const summary = summarizeLogData(cyclic, 200);
    const serialized = JSON.stringify(summary);

    expect(serialized.length).toBeLessThanOrEqual(220);
    expect(serialized).toContain('[Circular]');
    expect(serialized).toContain('byteLength');
    expect(serialized).not.toContain('[1,2,3]');
  });
});
