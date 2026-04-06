import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { deleteFrame, insertFrame, listFrames } from "./db";

export const appRouter = router({
  system: systemRouter,

  frames: router({
    list: publicProcedure.query(async ({ ctx }) => {
      return listFrames(ctx.env.DB);
    }),

    upload: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          dataUrl: z.string().min(1),
          mimeType: z.string().default("image/png"),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        await insertFrame(ctx.env.DB, { name: input.name, imageUrl: input.dataUrl });
        return { success: true, url: input.dataUrl };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const frame = await deleteFrame(ctx.env.DB, input.id);
        if (!frame) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Frame not found" });
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
