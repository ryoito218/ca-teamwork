export type Env = {
  ASSETS: Fetcher;
};

export type TrpcContext = {
  env: Env;
};

export function createContext(env: Env): TrpcContext {
  return { env };
}
