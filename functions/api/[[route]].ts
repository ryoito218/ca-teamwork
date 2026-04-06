import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext, type Env } from "../../server/_core/context";
import { appRouter } from "../../server/routers";

export const onRequest: PagesFunction<Env> = (context) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: context.request,
    router: appRouter,
    createContext: () => createContext(context.env),
  });
};
