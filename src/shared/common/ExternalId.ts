const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MIN_LENGTH = 8;
const CHECKSUM_MODULUS = 4096;

function charAt(alphabet: string[], index: number): string {
  const char = alphabet[index];

  if (char === undefined) {
    throw new Error(`Alphabet index out of bounds: ${index}`);
  }

  return char;
}

export class ExternalId {
  private static readonly encoderCache = new Map<string, string[]>();

  static encode(id: number, entityType: string): string {
    const alphabet = ExternalId.getAlphabet(entityType);
    const base = alphabet.length;
    const checksum = Math.abs(ExternalId.hashString(entityType)) % CHECKSUM_MODULUS;
    let value = id * CHECKSUM_MODULUS + checksum;
    let result = '';

    if (value === 0) {
      result = charAt(alphabet, 0);
    } else {
      while (value > 0) {
        result = charAt(alphabet, value % base) + result;
        value = Math.floor(value / base);
      }
    }

    while (result.length < MIN_LENGTH) {
      result = charAt(alphabet, 0) + result;
    }

    return result;
  }

  static decode(externalId: string, entityType: string): number | null {
    if (externalId.length === 0) {
      return null;
    }

    if (!/^[0-9a-zA-Z]+$/.test(externalId)) {
      return null;
    }

    const alphabet = ExternalId.getAlphabet(entityType);
    const base = alphabet.length;
    const charToIndex = new Map<string, number>();

    for (let i = 0; i < alphabet.length; i++) {
      charToIndex.set(charAt(alphabet, i), i);
    }

    let payload = 0;

    for (const char of externalId) {
      const index = charToIndex.get(char);

      if (index === undefined) {
        return null;
      }

      payload = payload * base + index;
    }

    const checksum = payload % CHECKSUM_MODULUS;
    const expectedChecksum = Math.abs(ExternalId.hashString(entityType)) % CHECKSUM_MODULUS;

    if (checksum !== expectedChecksum) {
      return null;
    }

    const id = Math.floor(payload / CHECKSUM_MODULUS);

    if (ExternalId.encode(id, entityType) !== externalId) {
      return null;
    }

    return id;
  }

  private static getAlphabet(entityType: string): string[] {
    const cached = ExternalId.encoderCache.get(entityType);

    if (cached) {
      return cached;
    }

    const alphabet = ExternalId.shuffleAlphabet(entityType);
    ExternalId.encoderCache.set(entityType, alphabet);

    return alphabet;
  }

  private static shuffleAlphabet(entityType: string): string[] {
    const chars = BASE62_ALPHABET.split('');
    const seed = ExternalId.hashString(entityType);
    let state = seed;

    for (let i = chars.length - 1; i > 0; i--) {
      state = ExternalId.nextRandom(state);
      const j = Math.abs(state) % (i + 1);
      const a = charAt(chars, i);
      const b = charAt(chars, j);
      chars[i] = b;
      chars[j] = a;
    }

    return chars;
  }

  private static hashString(str: string): number {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }

    return hash;
  }

  private static nextRandom(state: number): number {
    state = (state ^ (state << 13)) | 0;
    state = (state ^ (state >> 17)) | 0;
    state = (state ^ (state << 5)) | 0;

    return state;
  }
}
