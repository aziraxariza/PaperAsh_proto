import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { comments, InsertComment, InsertPost, InsertPostPhoto, postPhotos, posts, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllPosts() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(posts).orderBy(desc(posts.publishedAt));
  return Promise.all(rows.map(async post => ({
    ...post,
    photos: await db.select().from(postPhotos).where(eq(postPhotos.postId, post.id)).orderBy(postPhotos.sortOrder),
  })));
}

export async function getPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  const post = rows[0];
  if (!post) return undefined;
  const [photos, postComments] = await Promise.all([
    db.select().from(postPhotos).where(eq(postPhotos.postId, post.id)).orderBy(postPhotos.sortOrder),
    db.select().from(comments).where(and(eq(comments.postId, post.id), eq(comments.approved, 1))).orderBy(desc(comments.createdAt)),
  ]);
  return { ...post, photos, comments: postComments };
}

export async function insertPost(post: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(posts).values(post);
  return Number(result[0].insertId);
}

export async function insertPostPhotos(photos: InsertPostPhoto[]) {
  const db = await getDb();
  if (!db || photos.length === 0) return;
  await db.insert(postPhotos).values(photos);
}

export async function insertComment(comment: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(comments).values({ ...comment, approved: 0 });
}

export async function getAllComments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).orderBy(desc(comments.createdAt));
}

export async function setCommentApproval(commentId: number, approved: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(comments).set({ approved }).where(eq(comments.id, commentId));
}

export async function deleteCommentById(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(comments).where(eq(comments.id, commentId));
}

export async function deletePostById(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(comments).where(eq(comments.postId, postId));
  await db.delete(postPhotos).where(eq(postPhotos.postId, postId));
  await db.delete(posts).where(eq(posts.id, postId));
}
