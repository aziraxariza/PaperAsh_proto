import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { checkAdminCredentials, signSession } from "./_core/auth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { ENV } from "./_core/env";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { deleteCommentById, deletePostById, getAllComments, getAllPosts, getPostBySlug, insertComment, insertPost, insertPostPhotos, setCommentApproval } from "./db";
import { storagePut } from "./storage";

const ownerOnly = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the blog owner can manage posts." });
  }
  return next();
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 150) || "untitled-entry";
}

function plainExcerpt(html: string, fallback: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 340);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const session = checkAdminCredentials(input.email, input.password);
        if (!session) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect email or password." });
        }
        const sessionToken = await signSession(session, { expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  blog: router({
    list: publicProcedure.query(() => getAllPosts()),
    bySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(({ input }) => getPostBySlug(input.slug)),
    create: ownerOnly.input(z.object({
      title: z.string().trim().min(1).max(220),
      body: z.string().min(1).max(50000),
      excerpt: z.string().trim().max(360).optional(),
      publishedAt: z.string().datetime(),
      photos: z.array(z.object({ name: z.string().max(240), type: z.string().regex(/^image\//), data: z.string().startsWith("data:") })).max(8),
    })).mutation(async ({ input, ctx }) => {
      const baseSlug = slugify(input.title);
      const slug = `${baseSlug}-${Date.now().toString(36)}`;
      const postId = await insertPost({
        slug,
        title: input.title,
        body: input.body,
        excerpt: input.excerpt || plainExcerpt(input.body, input.title),
        publishedAt: new Date(input.publishedAt),
        authorId: ctx.user.id,
      });
      const uploaded = await Promise.all(input.photos.map(async (photo, index) => {
        const base64 = photo.data.split(",")[1];
        if (!base64) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image data." });
        const buffer = Buffer.from(base64, "base64");
        if (buffer.length > 8 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Each image must be 8MB or smaller." });
        const stored = await storagePut(`paper-ash-diary/${postId}/${photo.name}`, buffer, photo.type);
        return { postId, storageKey: stored.key, url: stored.url, altText: input.title, sortOrder: index };
      }));
      await insertPostPhotos(uploaded);
      return { slug };
    }),
    remove: ownerOnly.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deletePostById(input.id).then(() => ({ success: true }))),
    moderation: ownerOnly.query(() => getAllComments()),
    setCommentApproval: ownerOnly.input(z.object({ id: z.number().int().positive(), approved: z.boolean() })).mutation(async ({ input }) => { await setCommentApproval(input.id, input.approved ? 1 : 0); return { success: true }; }),
    deleteComment: ownerOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await deleteCommentById(input.id); return { success: true }; }),
    addComment: publicProcedure.input(z.object({
      postId: z.number().int().positive(),
      authorName: z.string().trim().min(1).max(100),
      body: z.string().trim().min(1).max(2000),
    })).mutation(async ({ input }) => {
      const post = await getPostBySlug(String(input.postId));
      if (!post) {
        const dbPost = (await getAllPosts()).find(item => item.id === input.postId);
        if (!dbPost) throw new TRPCError({ code: "NOT_FOUND", message: "That entry could not be found." });
      }
      await insertComment(input);
      return { success: true, pending: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
