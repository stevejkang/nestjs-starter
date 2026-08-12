import { createHmac, timingSafeEqual } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { config, DEFAULT_HMAC_PEPPER, IS_TEST } from '../config/config';

export class HmacHandler {
  private static defaultPepperWarned = false;

  static hash(value: string, pepper?: string): string {
    const key = pepper ?? config.HMAC_PEPPER;

    if (!HmacHandler.defaultPepperWarned && key === DEFAULT_HMAC_PEPPER && !IS_TEST) {
      const logger = new Logger(HmacHandler.name);
      logger.warn('HMAC_PEPPER is using the built-in default — set a real pepper before hashing real secrets');
      HmacHandler.defaultPepperWarned = true;
    }

    return createHmac('sha256', key).update(value).digest('hex');
  }

  static compare(value: string, storedHash: string, pepper?: string): boolean {
    const computedHash = HmacHandler.hash(value, pepper);
    const a = Buffer.from(computedHash);
    const b = Buffer.from(storedHash);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }
}
