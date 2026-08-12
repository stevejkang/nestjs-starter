import { AesEncryptionHandler } from './AesEncryptionHandler';

describe('AesEncryptionHandler', () => {
  describe('encrypt', () => {
    it('should return a string in iv:authTag:ciphertext format (3 parts)', () => {
      const encrypted = AesEncryptionHandler.encrypt('hello');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same plaintext';
      const encrypted1 = AesEncryptionHandler.encrypt(plaintext);
      const encrypted2 = AesEncryptionHandler.encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should work with empty string', () => {
      const encrypted = AesEncryptionHandler.encrypt('');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });

    it('should work with Unicode/Korean characters', () => {
      const encrypted = AesEncryptionHandler.encrypt('안녕하세요 테스트');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });
  });

  describe('decrypt', () => {
    it('should round-trip: decrypt(encrypt(plaintext)) === plaintext', () => {
      const plaintext = 'my secret data';
      const encrypted = AesEncryptionHandler.encrypt(plaintext);
      const decrypted = AesEncryptionHandler.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should round-trip with empty string', () => {
      const plaintext = '';
      const encrypted = AesEncryptionHandler.encrypt(plaintext);
      const decrypted = AesEncryptionHandler.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should round-trip with Unicode/Korean characters', () => {
      const plaintext = '안녕하세요 테스트 🎉';
      const encrypted = AesEncryptionHandler.encrypt(plaintext);
      const decrypted = AesEncryptionHandler.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw when decrypting tampered ciphertext', () => {
      const encrypted = AesEncryptionHandler.encrypt('original data');
      const parts = encrypted.split(':');
      const tamperedCiphertext = Buffer.from('tampered data').toString('base64');
      const tampered = [parts[0], parts[1], tamperedCiphertext].join(':');
      expect(() => AesEncryptionHandler.decrypt(tampered)).toThrow();
    });

    it('should throw when decrypting tampered auth tag', () => {
      const encrypted = AesEncryptionHandler.encrypt('original data');
      const parts = encrypted.split(':');
      const tamperedAuthTag = Buffer.from('0'.repeat(16)).toString('base64');
      const tampered = [parts[0], tamperedAuthTag, parts[2]].join(':');
      expect(() => AesEncryptionHandler.decrypt(tampered)).toThrow();
    });

    it('should throw on malformed encrypted data with only 2 parts', () => {
      expect(() => AesEncryptionHandler.decrypt('a:b')).toThrow('Invalid encrypted data format');
    });

    it('should throw on empty string input', () => {
      expect(() => AesEncryptionHandler.decrypt('')).toThrow();
    });

    it('should round-trip with 10KB plaintext', () => {
      const plaintext = 'x'.repeat(10 * 1024);
      const encrypted = AesEncryptionHandler.encrypt(plaintext);
      const decrypted = AesEncryptionHandler.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('getKey', () => {
    it('should throw on malformed key (63 hex chars)', async () => {
      jest.resetModules();

      const originalEnv = process.env.AES_ENCRYPTION_KEY;
      process.env.AES_ENCRYPTION_KEY = 'a'.repeat(63);

      try {
        const { AesEncryptionHandler: FreshHandler } = await import('./AesEncryptionHandler');
        expect(() => FreshHandler.encrypt('test')).toThrow('AES_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      } finally {
        if (originalEnv === undefined) {
          delete process.env.AES_ENCRYPTION_KEY;
        } else {
          process.env.AES_ENCRYPTION_KEY = originalEnv;
        }
        jest.resetModules();
      }
    });
  });
});
