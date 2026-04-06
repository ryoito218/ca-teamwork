import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db helpers
vi.mock("./db", () => ({
  listFrames: vi.fn().mockResolvedValue([
    { id: 1, name: "Test Frame", imageUrl: "https://example.com/frame.png", fileKey: "frames/test.png", createdAt: new Date() },
  ]),
  insertFrame: vi.fn().mockResolvedValue(undefined),
  deleteFrame: vi.fn().mockResolvedValue({ id: 1, name: "Test Frame", imageUrl: "https://example.com/frame.png", fileKey: "frames/test.png", createdAt: new Date() }),
  getFrameById: vi.fn().mockResolvedValue({ id: 1, name: "Test Frame", imageUrl: "https://example.com/frame.png", fileKey: "frames/test.png", createdAt: new Date() }),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/frames/test.png", key: "frames/test.png" }),
}));

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("frames.list", () => {
  it("returns frames for anyone (no login required)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.frames.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Frame");
  });
});

describe("frames.upload", () => {
  it("allows anyone to upload a frame (no login required)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.frames.upload({
      name: "New Frame",
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      mimeType: "image/png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty frame name", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.frames.upload({ name: "", dataUrl: "data:image/png;base64,abc", mimeType: "image/png" })
    ).rejects.toThrow();
  });
});

describe("frames.delete", () => {
  it("allows anyone to delete a frame (no login required)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.frames.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects invalid id (zero)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.frames.delete({ id: 0 })).rejects.toThrow();
  });
});
