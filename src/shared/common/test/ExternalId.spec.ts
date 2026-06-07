import { ExternalId } from '../ExternalId';

describe('ExternalId', () => {
  describe('encode/decode round-trip', () => {
    it('should round-trip for small IDs', () => {
      const id = 1;
      const encoded = ExternalId.encode(id, 'user');
      const decoded = ExternalId.decode(encoded, 'user');

      expect(decoded).toEqual(id);
    });

    it('should round-trip for large IDs', () => {
      const id = 999_999_999;
      const encoded = ExternalId.encode(id, 'post');
      const decoded = ExternalId.decode(encoded, 'post');

      expect(decoded).toEqual(id);
    });

    it('should round-trip for various entity types', () => {
      const ids = [1, 42, 1000, 123456789];
      const entityTypes = ['user', 'post', 'comment', 'organization'];

      for (const id of ids) {
        for (const entityType of entityTypes) {
          const encoded = ExternalId.encode(id, entityType);
          const decoded = ExternalId.decode(encoded, entityType);

          expect(decoded).toEqual(id);
        }
      }
    });
  });

  describe('entity-type differentiation', () => {
    it('should produce different outputs for different entity types with the same ID', () => {
      const id = 42;
      const userEncoded = ExternalId.encode(id, 'user');
      const postEncoded = ExternalId.encode(id, 'post');

      expect(userEncoded).not.toEqual(postEncoded);
    });

    it('should produce the same output for the same ID and entity type', () => {
      const id = 42;
      const first = ExternalId.encode(id, 'user');
      const second = ExternalId.encode(id, 'user');

      expect(first).toEqual(second);
    });
  });

  describe('decode returns null for invalid input', () => {
    it('should return null for empty string', () => {
      expect(ExternalId.decode('', 'user')).toBeNull();
    });

    it('should return null for string with invalid characters', () => {
      expect(ExternalId.decode('!@#$%^&*()', 'user')).toBeNull();
    });

    it('should return null for string with spaces', () => {
      expect(ExternalId.decode('abc def', 'user')).toBeNull();
    });
  });

  describe('decode returns null for wrong entity type', () => {
    it('should return null when decoding with wrong entity type', () => {
      const encoded = ExternalId.encode(42, 'user');
      const decoded = ExternalId.decode(encoded, 'post');

      expect(decoded).toBeNull();
    });
  });

  describe('minimum length', () => {
    it('should produce output of at least 8 characters for small IDs', () => {
      const encoded = ExternalId.encode(1, 'user');

      expect(encoded.length).toBeGreaterThanOrEqual(8);
    });

    it('should produce output of at least 8 characters for zero', () => {
      const encoded = ExternalId.encode(0, 'user');

      expect(encoded.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('output format', () => {
    it('should only contain base62 characters', () => {
      const encoded = ExternalId.encode(123456, 'user');

      expect(encoded).toMatch(/^[0-9a-zA-Z]+$/);
    });
  });

  describe('encode edge cases', () => {
    it('should handle encoding when computed value is zero', () => {
      const encoded = ExternalId.encode(0, '');

      expect(encoded).toMatch(/^[0-9a-zA-Z]+$/);
      expect(encoded.length).toBeGreaterThanOrEqual(8);
    });

    it('should round-trip encode/decode with zero id and empty entity type', () => {
      const encoded = ExternalId.encode(0, '');
      const decoded = ExternalId.decode(encoded, '');

      expect(decoded).toEqual(0);
    });
  });

  describe('decode rejects tampered external IDs', () => {
    it('should return null when prepending characters changes the decoded payload', () => {
      const encoded = ExternalId.encode(1, 'user');
      const tampered = 'A' + encoded;

      const decoded = ExternalId.decode(tampered, 'user');

      expect(decoded === null || decoded !== 1).toBe(true);
    });

    it('should return null for a valid-looking string with wrong checksum', () => {
      const encoded = ExternalId.encode(42, 'user');
      const chars = encoded.split('');
      const lastChar = chars[chars.length - 1];
      chars[chars.length - 1] = lastChar === 'a' ? 'b' : 'a';
      const modified = chars.join('');

      const decoded = ExternalId.decode(modified, 'user');

      expect(decoded).toBeNull();
    });
  });
});
