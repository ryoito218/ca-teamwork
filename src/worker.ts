import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext, type Env } from "../server/_core/context";
import { appRouter } from "../server/routers";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/trpc")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: () => createContext(env),
      });
    }

    return env.ASSETS.fetch(request);
  },
};
