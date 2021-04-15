declare class Encryption {
    static createHash(algorithm: 'sha256' | 'md5', text: string): string;
    static encodeNextToken(data: {
        [key: string]: unknown;
    }): string;
    static decodeNextToken(hash: string): {
        [key: string]: unknown;
    };
}
export { Encryption };
