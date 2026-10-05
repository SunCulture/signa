import { AmtOtpClient } from './amt-otp.client';

const REF = { submissionId: 'submission-1', submitterId: 'submitter-1' };

describe('AmtOtpClient', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('posts the code to AMT with the api_key header', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ok: true, challengeId: 'challenge-1' }),
    );

    await expect(clientWith().verify(REF, '123456')).resolves.toEqual({
      status: 'verified',
      challengeId: 'challenge-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://amt.test/api/e-signing/signa/otp/verify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', api_key: 'key-1' },
        body: JSON.stringify({ ...REF, code: '123456' }),
      }),
    );
  });

  it('reads a rejected code as invalid', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: false }));

    await expect(clientWith().verify(REF, '000000')).resolves.toEqual({
      status: 'invalid',
    });
  });

  it('fails closed without config, on a non-2xx answer, or on a timeout', async () => {
    await expect(
      clientWith({ AMT_API_KEY: '' }).verify(REF, '123456'),
    ).resolves.toEqual({ status: 'unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(jsonResponse(500, {}));
    await expect(clientWith().verify(REF, '123456')).resolves.toEqual({
      status: 'unavailable',
    });

    fetchMock.mockImplementationOnce(abortWhenSignalled);
    await expect(
      clientWith({ AMT_REQUEST_TIMEOUT_MS: 5 }).isCurrent(REF, 'challenge-1'),
    ).resolves.toBe('unavailable');
  });

  it('maps the current answer to current or stale', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { current: true }))
      .mockResolvedValueOnce(jsonResponse(200, { current: false }));

    await expect(clientWith().isCurrent(REF, 'challenge-1')).resolves.toBe(
      'current',
    );
    await expect(clientWith().isCurrent(REF, 'challenge-1')).resolves.toBe(
      'stale',
    );
  });
});

function clientWith(overrides: Record<string, unknown> = {}): AmtOtpClient {
  const values: Record<string, unknown> = {
    AMT_API_BASE_URL: 'https://amt.test/api/',
    AMT_API_KEY: 'key-1',
    AMT_REQUEST_TIMEOUT_MS: 5_000,
    ...overrides,
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  };
  return new AmtOtpClient(config as never);
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function abortWhenSignalled(
  _url: string,
  init: { signal: AbortSignal },
): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });
}
