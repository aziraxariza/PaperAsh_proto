import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const baseContext = (user: TrpcContext["user"]): TrpcContext => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
});

describe("blog authorization and validation", () => {
  it("rejects post deletion for a non-owner user", async () => {
    const caller = appRouter.createCaller(baseContext({
      id: 2, openId: "visitor", email: "visitor@example.com", name: "Visitor", loginMethod: "manus", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    }));
    await expect(caller.blog.remove({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects comment moderation for a non-owner user", async () => {
    const caller = appRouter.createCaller(baseContext({
      id: 2, openId: "visitor", email: "visitor@example.com", name: "Visitor", loginMethod: "manus", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    }));
    await expect(caller.blog.setCommentApproval({ id: 1, approved: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.blog.deleteComment({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts public comment input at the contract boundary", async () => {
    const caller = appRouter.createCaller(baseContext(null));
    await expect(caller.blog.addComment({ postId: 1, authorName: "A reader", body: "This stayed with me." })).rejects.not.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects blank public comments before reaching persistence", async () => {
    const caller = appRouter.createCaller(baseContext(null));
    await expect(caller.blog.addComment({ postId: 1, authorName: "", body: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
