import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    contentType: v.union(
      v.literal("tweet"),
      v.literal("blog"),
      v.literal("email"),
      v.literal("essay")
    ),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      title: args.title,
      contentType: args.contentType,
      status: "interviewing",
    });
    return sessionId;
  },
});

export const updateStatus = mutation({
  args: {
    sessionId: v.id("sessions"),
    status: v.union(
      v.literal("interviewing"),
      v.literal("drafting"),
      v.literal("refining"),
      v.literal("complete")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: args.status });
  },
});

export const updateTitle = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { title: args.title });
  },
});
