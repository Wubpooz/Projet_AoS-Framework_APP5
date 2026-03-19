import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { flushAsync } from '../test/common-test-utils';

const appendFileMock = mock(async () => undefined);
const mkdirMock = mock(async () => undefined);

mock.module('node:fs/promises', () => ({
  appendFile: appendFileMock,
  mkdir: mkdirMock,
}));

describe('requestLogger middleware', () => {
  const originalLogDir = process.env.LOG_DIR;
  const originalLogFile = process.env.LOG_FILE;
  const consoleLogSpy = mock(() => undefined);
  const consoleErrorSpy = mock(() => undefined);

  beforeEach(() => {
    process.env.LOG_DIR = 'logs-test';
    process.env.LOG_FILE = 'test.log';

    appendFileMock.mockClear();
    mkdirMock.mockClear();
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();

    console.log = consoleLogSpy as unknown as typeof console.log;
    console.error = consoleErrorSpy as unknown as typeof console.error;
  });

  it('writes a timestamped line to stdout and file', async () => {
    const { customLogger } = await import('./requestLogger');

    customLogger('GET /api/media', '200', '12ms');
    await flushAsync();

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedCall = consoleLogSpy.mock.calls[0];
    expect(loggedCall).toBeDefined();
    const loggedLine = (loggedCall as unknown as [string])[0];
    expect(loggedLine).toContain('GET /api/media 200 12ms');

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    const mkdirCall = mkdirMock.mock.calls[0] as unknown as [string, { recursive: boolean }];
    expect(typeof mkdirCall[0]).toBe('string');
    expect(mkdirCall[1]).toEqual({ recursive: true });
    expect(appendFileMock).toHaveBeenCalledTimes(1);

    const appendCall = appendFileMock.mock.calls[0];
    expect(appendCall).toBeDefined();
    const appendArgs = appendCall as unknown as [string, string];
    expect(appendArgs[0].endsWith('.log')).toBe(true);
    expect(appendArgs[1]).toContain('GET /api/media 200 12ms');
    expect(appendArgs[1].endsWith('\n')).toBe(true);
  });

  it('logs file write failures without throwing', async () => {
    appendFileMock.mockImplementationOnce(async () => {
      throw new Error('disk full');
    });

    const { customLogger } = await import('./requestLogger');

    customLogger('GET /health', '500');
    await flushAsync();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const errorCall = consoleErrorSpy.mock.calls[0];
    expect(errorCall).toBeDefined();
    expect((errorCall as unknown as [string])[0]).toContain('Failed to write log file');
  });

  afterAll(() => {
    process.env.LOG_DIR = originalLogDir;
    process.env.LOG_FILE = originalLogFile;
  });
});
