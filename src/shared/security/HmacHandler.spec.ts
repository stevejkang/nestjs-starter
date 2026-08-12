import { createHmac } from 'node:crypto';
import { HmacHandler } from './HmacHandler';

describe('HmacHandler', () => {
  describe('hash()', () => {
    it('produces consistent output for same input', () => {
      const value = 'test-api-key';
      const hash1 = HmacHandler.hash(value);
      const hash2 = HmacHandler.hash(value);
      expect(hash1).toBe(hash2);
    });

    it('produces different output for different inputs', () => {
      const hash1 = HmacHandler.hash('input-a');
      const hash2 = HmacHandler.hash('input-b');
      expect(hash1).not.toBe(hash2);
    });

    it('returns a hex string', () => {
      const hash = HmacHandler.hash('some-value');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces different hashes with different peppers', () => {
      const value = 'same-value';
      const hash1 = HmacHandler.hash(value, 'pepper-one');
      const hash2 = HmacHandler.hash(value, 'pepper-two');
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string input', () => {
      const hash = HmacHandler.hash('');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('per-call pepper overrides the config pepper', () => {
      const value = 'override-test';
      const hashDefault = HmacHandler.hash(value);
      const hashExplicit = HmacHandler.hash(value, 'explicit-pepper');
      expect(hashDefault).not.toBe(hashExplicit);
    });

    it('matches a locally computed HMAC-SHA256 reference', () => {
      const value = 'cross-check-value';
      const pepper = 'reference-pepper';
      const expected = createHmac('sha256', pepper).update(value).digest('hex');
      expect(HmacHandler.hash(value, pepper)).toBe(expected);
    });
  });

  describe('compare()', () => {
    it('returns true for matching value and hash', () => {
      const value = 'my-secret-key';
      const storedHash = HmacHandler.hash(value);
      expect(HmacHandler.compare(value, storedHash)).toBe(true);
    });

    it('returns false for non-matching value', () => {
      const storedHash = HmacHandler.hash('correct-value');
      expect(HmacHandler.compare('wrong-value', storedHash)).toBe(false);
    });

    it('handles empty string gracefully', () => {
      const storedHash = HmacHandler.hash('');
      expect(HmacHandler.compare('', storedHash)).toBe(true);
    });

    it('returns false when comparing empty string against non-empty hash', () => {
      const storedHash = HmacHandler.hash('non-empty');
      expect(HmacHandler.compare('', storedHash)).toBe(false);
    });

    it('uses pepper consistently in compare', () => {
      const value = 'api-key-value';
      const pepper = 'custom-pepper';
      const storedHash = HmacHandler.hash(value, pepper);
      expect(HmacHandler.compare(value, storedHash, pepper)).toBe(true);
    });

    it('returns false when pepper differs between hash and compare', () => {
      const value = 'api-key-value';
      const storedHash = HmacHandler.hash(value, 'pepper-a');
      expect(HmacHandler.compare(value, storedHash, 'pepper-b')).toBe(false);
    });

    it('returns false without throwing when storedHash has different length', () => {
      expect(HmacHandler.compare('some-value', 'short')).toBe(false);
    });
  });
});
