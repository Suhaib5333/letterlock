import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crashReportingConfigured, initCrashReporting, reportError } from './crash';

describe('crash reporting', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('is inert without a DSN, so a build without one never loads the SDK', () => {
    expect(crashReportingConfigured()).toBe(false);
    expect(() => initCrashReporting('1.0.0')).not.toThrow();
  });

  it('always logs, and never throws out of reportError', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportError(new Error('boom'), 'unit-test');
    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0][0])).toContain('unit-test');
  });
});
