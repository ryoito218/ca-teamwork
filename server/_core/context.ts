export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

export type TrpcContext = {
  env: Env;
};

export function createContext(env: Env): TrpcContext {
  return { env };
}
