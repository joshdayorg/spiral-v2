import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Writing sessions
  sessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    contentType: v.union(
      v.literal("tweet"),
      v.literal("blog"),
      v.literal("email"),
      v.literal("essay")
    ),
    status: v.union(
      v.literal("interviewing"),
      v.literal("drafting"),
      v.literal("refining"),
      v.literal("complete")
    ),
  }).index("by_userId", ["userId"]),

  // Chat messages
  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    agent: v.optional(v.union(v.literal("orchestrator"), v.literal("writer"))),
    reasoning: v.optional(v.string()),
    toolCalls: v.optional(
      v.array(
        v.object({
          toolName: v.string(),
          toolCallId: v.string(),
        })
      )
    ),
  }).index("by_session", ["sessionId"]),

  // Generated drafts
  drafts: defineTable({
    sessionId: v.id("sessions"),
    title: v.string(),
    content: v.string(),
    strategy: v.string(),
    wordCount: v.number(),
    version: v.number(),
    isSelected: v.boolean(),
  }).index("by_session", ["sessionId"]),

  // Writing styles
  styles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    sampleText: v.optional(v.string()),
    settings: v.any(),
  }).index("by_userId", ["userId"]),
});
