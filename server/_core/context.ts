export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  ASSETS: Fetcher;
};

export type TrpcContext = {
  env: Env;
};

export function createContext(env: Env): TrpcContext {
  return { env };
}
