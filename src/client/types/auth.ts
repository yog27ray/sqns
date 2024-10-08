export declare interface AuthRequest {
  originalUrl: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  service: string;
  region: string;
}

export declare interface Credentials { accessKeyId: string; secretAccessKey: string; }
