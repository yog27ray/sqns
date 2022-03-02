import crypto from 'crypto';

class Encryption {
  static createHash(algorithm: 'sha256' | 'md5', text: string): string {
    return crypto.createHash(algorithm).update(text, 'utf8').digest('hex');
  }

  static encodeNextToken(data: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  static decodeNextToken(hash: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(hash, 'base64').toString()) as Record<string, unknown>;
  }
}

export { Encryption };
