import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { config, DEFAULT_AES_ENCRYPTION_KEY, IS_TEST } from '../config/config';

export class AesEncryptionHandler {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static defaultKeyWarned = false;

  private static getKey(): Buffer {
    const key = config.AES_ENCRYPTION_KEY;

    if (!AesEncryptionHandler.defaultKeyWarned && key === DEFAULT_AES_ENCRYPTION_KEY && !IS_TEST) {
      const logger = new Logger(AesEncryptionHandler.name);
      logger.warn('AES_ENCRYPTION_KEY is using the built-in default — set a real key before encrypting real data');
      AesEncryptionHandler.defaultKeyWarned = true;
    }

    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error('AES_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }

    return Buffer.from(key, 'hex');
  }

  static encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  static decrypt(encryptedData: string): string {
    const key = this.getKey();
    const parts = encryptedData.split(':');
    if (parts.length !== 3 || parts[0] === undefined || parts[1] === undefined || parts[2] === undefined) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
