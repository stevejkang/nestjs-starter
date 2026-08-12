describe('config - optional keys', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns the env value when AES_ENCRYPTION_KEY is set', async () => {
    const customKey = 'a'.repeat(64);
    process.env.AES_ENCRYPTION_KEY = customKey;

    const { config } = await import('../config');

    expect(config.AES_ENCRYPTION_KEY).toBe(customKey);
  });

  it('returns the default when AES_ENCRYPTION_KEY is unset', async () => {
    delete process.env.AES_ENCRYPTION_KEY;

    const { config, DEFAULT_AES_ENCRYPTION_KEY } = await import('../config');

    expect(config.AES_ENCRYPTION_KEY).toBe(DEFAULT_AES_ENCRYPTION_KEY);
  });

  // This is the load-bearing difference between optional<T> and required<T>:
  // deployment.yml's envsubst renders unlisted keys as '' (empty string).
  // required<T> throws on ''; optional<T> treats '' as absent and returns the default.
  it('returns the default when AES_ENCRYPTION_KEY is set to empty string (optional vs required difference)', async () => {
    process.env.AES_ENCRYPTION_KEY = '';

    const { config, DEFAULT_AES_ENCRYPTION_KEY } = await import('../config');

    expect(config.AES_ENCRYPTION_KEY).toBe(DEFAULT_AES_ENCRYPTION_KEY);
  });

  it('DEFAULT_AES_ENCRYPTION_KEY is exactly 64 hex characters', async () => {
    const { DEFAULT_AES_ENCRYPTION_KEY } = await import('../config');

    expect(DEFAULT_AES_ENCRYPTION_KEY).toMatch(/^[0-9a-fA-F]{64}$/);
  });

  it('returns the env value when HMAC_PEPPER is set', async () => {
    process.env.HMAC_PEPPER = 'custom-pepper-value';

    const { config } = await import('../config');

    expect(config.HMAC_PEPPER).toBe('custom-pepper-value');
  });

  it('returns the default when HMAC_PEPPER is unset', async () => {
    delete process.env.HMAC_PEPPER;

    const { config, DEFAULT_HMAC_PEPPER } = await import('../config');

    expect(config.HMAC_PEPPER).toBe(DEFAULT_HMAC_PEPPER);
  });
});
