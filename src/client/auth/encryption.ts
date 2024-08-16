import crypto from 'crypto';

class Encryption {
  static rfc3986EncodeURIComponent(str: string): string {
    return encodeURIComponent(str).replace(/[!'()*]/g, escape);
  }

  static createHash(algorithm: 'sha256' | 'md5', text: string): string {
    return crypto.createHash(algorithm).update(text, 'utf8').digest('hex');
  }

  static createHmac(algorithm: 'sha256' | 'md5', key: string, text: string): string {
    return crypto.createHmac(algorithm, key).update(text, 'utf8').digest('hex');
  }

  static encodeNextToken(data: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  static decodeNextToken(hash: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(hash, 'base64').toString()) as Record<string, unknown>;
  }

  static createJSONHash(algorithm: 'sha256' | 'md5', record: Record<string, unknown>): string {
    const text = Encryption.createFlatRecord(record);
    return Encryption.createHash(algorithm, text);
  }

  static createJSONHmac(algorithm: 'sha256' | 'md5', key: string, record: Record<string, unknown>): string {
    const text = Encryption.createFlatRecord(record);
    return Encryption.createHmac(algorithm, key, text);
  }

  private static createFlatRecord(item: unknown): string {
    if (typeof item !== 'object') {
      return Encryption.rfc3986EncodeURIComponent(item as string);
    }
    if (item instanceof Array) {
      return (item as Array<unknown>).map((each: unknown) => Encryption.createFlatRecord(each)).join(',');
    }
    const record = item as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .filter((key) => (record[key] !== undefined))
      .map((key: string) => `${key}=${Encryption.createFlatRecord(record[key])}`).join('&');
  }
}

export { Encryption };
