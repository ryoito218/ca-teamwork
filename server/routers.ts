import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { deleteFrame, insertFrame, listFrames } from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  frames: router({
    // Public: list all frames
    list: publicProcedure.query(async () => {
      return listFrames();
    }),

    // Public: upload a frame (receives base64 data URL)
    upload: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          dataUrl: z.string().min(1),
          mimeType: z.string().default("image/png"),
        })
      )
      .mutation(async ({ input }) => {
        const base64Data = input.dataUrl.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const suffix = nanoid(8);
        const ext = input.mimeType === "image/jpeg" ? "jpg" : "png";
        const fileKey = `frames/${suffix}.${ext}`;

        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        await insertFrame({
          name: input.name,
          imageUrl: url,
          fileKey,
        });

        return { success: true, url };
      }),

    // Public: delete a frame
    delete: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const frame = await deleteFrame(input.id);
        if (!frame) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Frame not found" });
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
