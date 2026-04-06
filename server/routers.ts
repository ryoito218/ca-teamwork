import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { deleteFrame, insertFrame, listFrames } from "./db";
import { storageDelete, storagePut } from "./storage";

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
        const base64Data = input.dataUrl.replace(/^data:[^;]+;base64,/, "");
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const suffix = nanoid(8);
        const ext = input.mimeType === "image/jpeg" ? "jpg" : "png";
        const fileKey = `frames/${suffix}.${ext}`;

        const { url } = await storagePut(
          ctx.env.BUCKET,
          fileKey,
          bytes,
          input.mimeType,
          ctx.env.R2_PUBLIC_URL,
        );

        await insertFrame(ctx.env.DB, { name: input.name, imageUrl: url, fileKey });

        return { success: true, url };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const frame = await deleteFrame(ctx.env.DB, input.id);
        if (!frame) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Frame not found" });
        }
        await storageDelete(ctx.env.BUCKET, frame.fileKey);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
