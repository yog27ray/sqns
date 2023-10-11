declare class Encryption {
    static rfc3986EncodeURIComponent(str: string): string;
    static createHash(algorithm: 'sha256' | 'md5', text: string): string;
    static createHmac(algorithm: 'sha256' | 'md5', key: string, text: string): string;
    static encodeNextToken(data: Record<string, unknown>): string;
    static decodeNextToken(hash: string): Record<string, unknown>;
    static createJSONHash(algorithm: 'sha256' | 'md5', record: Record<string, unknown>): string;
    static createJSONHmac(algorithm: 'sha256' | 'md5', key: string, record: Record<string, unknown>): string;
    private static createFlatRecord;
}
export { Encryption };
