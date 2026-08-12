import path from 'path';
import dotenv from 'dotenv';

function getEnvironmentFilePath(): string {
  switch (process.env.NODE_ENV) {
    case 'production':
    case 'development':
      return '.env';
    case 'local_development':
      return '.env.local_development';
    case 'local_production':
      return '.env.local_production';
    case 'local':
      return '.env.local';
    default:
      return '.env';
  }
}

dotenv.config({
  path: path.resolve(getEnvironmentFilePath()),
});

function required<T>(key: string, defaultValue?: string): T {
  if (!IS_TEST && (typeof process.env[key] === 'undefined' && typeof defaultValue === 'undefined' || process.env[key] === '')) {
    throw new Error('Missing required environment variable: ' + key);
  }
  return process.env[key] as T || defaultValue as T;
}

function optional<T>(key: string, defaultValue: T): T {
  const value = process.env[key];
  if (typeof value === 'string' && value !== '') {
    return value as T;
  }
  return defaultValue;
}

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_TEST = process.env.NODE_ENV === 'test';
export const IS_LOCAL = process.env.NODE_ENV ? process.env.NODE_ENV.toString().startsWith('local') : false;

export const DEFAULT_AES_ENCRYPTION_KEY = '0'.repeat(64);
export const DEFAULT_HMAC_PEPPER = 'nestjs-starter-hmac-pepper';

export const config = {
  NODE_ENV: required<string>('NODE_ENV'),
  MYSQL: {
    HOST: required<string>('MYSQL_HOST'),
    PORT: required<number>('MYSQL_PORT'),
    USER: required<string>('MYSQL_USER'),
    PASSWORD: required<string>('MYSQL_PASSWORD'),
    DATABASE: required<string>('MYSQL_DATABASE'),
  },
  JWT_SECRET: required<string>('JWT_SECRET'),
  AES_ENCRYPTION_KEY: optional<string>('AES_ENCRYPTION_KEY', DEFAULT_AES_ENCRYPTION_KEY),
  HMAC_PEPPER: optional<string>('HMAC_PEPPER', DEFAULT_HMAC_PEPPER),
};

console.log(`[CONFIGURATION] Initialized from ${getEnvironmentFilePath()}`);
console.log(`[CONFIGURATION] RUNNING NODE ENV: ${config.NODE_ENV}`);
console.log(`[CONFIGURATION] RUNNING MYSQL DB HOST: ${config.MYSQL.HOST}`);
