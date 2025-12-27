"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Mic, Plus, Loader2, MessageSquare, ChevronLeft, FileText } from "lucide-react";
import { Tooltip } from "./tooltip";
import { EmptyState } from "./empty-state";
import { ThinkingBlock } from "./thinking-block";
import { ToolIndicator } from "./tool-indicator";
import { DraftPreviewCard } from "./draft-preview-card";
import { DraftPanel } from "./draft-panel";
import { parseDrafts, hasDrafts } from "@/lib/parse-drafts";

interface ChatInterfaceProps {
  sessionId: Id<"sessions">;
  userId: Id<"users">;
}

export function ChatInterface({ sessionId, userId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [showDraftPanel, setShowDraftPanel] = useState(false);
  const [hiddenDrafts, setHiddenDrafts] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const session = useQuery(api.sessions.get, { sessionId });
  const dbMessages = useQuery(api.messages.list, { sessionId });
  const drafts = useQuery(api.drafts.list, { sessionId });
  const sendMessageMutation = useMutation(api.messages.send);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const updateStatus = useMutation(api.sessions.updateStatus);
  const createDraft = useMutation(api.drafts.create);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { sessionId },
    }),
    onFinish: async ({ message }) => {
      // Extract text content
      const content = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      // Extract reasoning content
      const reasoning = message.parts
        .filter((p) => p.type === "reasoning" && "text" in p)
        .map((p) => (p as { type: "reasoning"; text: string }).text)
        .join("\n\n");

      // Extract tool calls
      const toolCalls = message.parts
        .filter((p) => p.type.startsWith("tool-") && "toolName" in p && "toolCallId" in p)
        .map((p) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolPart = p as any;
          return {
            toolName: toolPart.toolName as string,
            toolCallId: toolPart.toolCallId as string,
          };
        })
        // Dedupe by toolCallId
        .filter((tc, idx, arr) => arr.findIndex((t) => t.toolCallId === tc.toolCallId) === idx);

      if (hasDrafts(content)) {
        const parsedDrafts = parseDrafts(content);
        for (const draft of parsedDrafts) {
          await createDraft({
            sessionId,
            title: draft.title,
            content: draft.content,
            strategy: draft.strategy,
          });
        }
        if (parsedDrafts.length > 0) {
          await updateStatus({ sessionId, status: "drafting" });
        }
      }

      await sendMessageMutation({
        sessionId,
        role: "assistant",
        content,
        agent: hasDrafts(content) ? "writer" : "orchestrator",
        reasoning: reasoning || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const charCount = input.length;

  useEffect(() => {
    if (dbMessages && dbMessages.length > 0 && messages.length === 0) {
      setMessages(
        dbMessages.map((m) => {
          // Build parts array from saved message data
          const parts: Array<{
            type: string;
            text?: string;
            toolName?: string;
            toolCallId?: string;
          }> = [];

          // Add reasoning part if present
          if (m.reasoning) {
            parts.push({ type: "reasoning", text: m.reasoning });
          }

          // Add tool call parts if present
          if (m.toolCalls) {
            for (const tc of m.toolCalls) {
              parts.push({
                type: "tool-call",
                toolName: tc.toolName,
                toolCallId: tc.toolCallId,
              });
            }
          }

          // Add text content
          parts.push({ type: "text", text: m.content });

          return {
            id: m._id,
            role: m.role as "user" | "assistant",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parts: parts as any,
          };
        })
      );
    }
  }, [dbMessages, messages.length, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const text = input.trim();

    if (messages.length === 0 && session?.title === "New Session") {
      const title = text.length > 40 ? text.slice(0, 40) + "..." : text;
      await updateTitle({ sessionId, title });
    }

    await sendMessageMutation({
      sessionId,
      role: "user",
      content: text,
    });

    sendMessage({
      role: "user",
      parts: [{ type: "text", text }],
    });
    setInput("");
  };

  const hideDraft = (draftId: string) => {
    setHiddenDrafts((prev) => new Set([...prev, draftId]));
  };

  const visibleDrafts = drafts?.filter((d) => !hiddenDrafts.has(d._id)) || [];

  // Helper to extract parts from message
  const extractMessageParts = (message: (typeof messages)[0]) => {
    const parts: Array<{
      type: "text" | "reasoning" | "tool-invocation" | "tool-result";
      content: string;
      toolName?: string;
      state?: string;
    }> = [];

    // Track seen tool calls to avoid duplicates
    const seenToolCalls = new Set<string>();

    for (const part of message.parts) {
      if (part.type === "text" && "text" in part) {
        parts.push({ type: "text", content: part.text });
      } else if (part.type === "reasoning" && "text" in part) {
        // Reasoning parts have 'text' property per AI SDK docs
        parts.push({ type: "reasoning", content: part.text });
      } else if (part.type.startsWith("tool-")) {
        // Handle tool calls - AI SDK uses 'toolName' property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolPart = part as any;
        const toolName = toolPart.toolName || "unknown";
        const toolCallId = toolPart.toolCallId || "";

        // Dedupe tool calls by ID
        if (toolCallId && seenToolCalls.has(toolCallId)) continue;
        if (toolCallId) seenToolCalls.add(toolCallId);

        parts.push({
          type: "tool-invocation",
          content: toolName,
          toolName: toolName,
          state: toolPart.state || "complete",
        });
      }
    }

    return parts;
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <main className="flex-1 bg-[#1a1a1a] flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-center border-b border-transparent animate-fade-in">
          <h1 className="text-gray-200 font-medium truncate px-4">
            {session?.title || "New Session"}
          </h1>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 py-6 pb-32 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Start a new conversation"
                message="Type a prompt below to start generating content with AI."
              />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
              {messages.map((message) => {
                const messageParts = extractMessageParts(message);
                const textContent = messageParts
                  .filter((p) => p.type === "text")
                  .map((p) => p.content)
                  .join("");
                const reasoningParts = messageParts.filter((p) => p.type === "reasoning");
                const toolParts = messageParts.filter((p) => p.type === "tool-invocation");

                const isUser = message.role === "user";
                const isDraftMessage = hasDrafts(textContent);

                if (isUser) {
                  return (
                    <div key={message.id} className="flex justify-end animate-fade-in">
                      <div className="bg-[#262626] text-gray-200 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%] shadow-md">
                        {textContent}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className="space-y-3 animate-fade-in">
                    {/* Reasoning/Thinking blocks */}
                    {reasoningParts.map((part, idx) => (
                      <ThinkingBlock
                        key={`${message.id}-reasoning-${idx}`}
                        content={part.content}
                        state={isLoading ? "pondering" : "complete"}
                      />
                    ))}

                    {/* Tool indicators */}
                    <div className="flex flex-wrap gap-2">
                      {toolParts.map((part, idx) => (
                        <ToolIndicator
                          key={`${message.id}-tool-${idx}`}
                          toolName={part.toolName || "unknown"}
                          isLoading={part.state === "pending" || part.state === "running"}
                        />
                      ))}
                    </div>

                    {/* Text content */}
                    {textContent && !isDraftMessage && (
                      <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {textContent}
                      </div>
                    )}

                    {/* Draft summary message */}
                    {isDraftMessage && (
                      <div className="text-gray-300 text-sm leading-relaxed">
                        Created {visibleDrafts.length} drafts with different angles. Select one to
                        view the full content.
                      </div>
                    )}

                    {/* Draft preview cards */}
                    {isDraftMessage && visibleDrafts.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {visibleDrafts.map((draft) => (
                          <DraftPreviewCard
                            key={draft._id}
                            title={draft.title}
                            wordCount={draft.wordCount || draft.content.split(/\s+/).length}
                            onClose={() => hideDraft(draft._id)}
                            onSelect={() => setShowDraftPanel(true)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-gray-400 animate-fade-in">
                  <Loader2 size={16} className="animate-spin text-orange-500" />
                  <span className="text-sm">Writing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:px-8 lg:px-16 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a] to-transparent pt-12">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={onSubmit}>
              <div className="bg-[#262626] rounded-xl border border-[#333] p-2 shadow-2xl transition-all duration-200 focus-within:border-gray-600 focus-within:ring-1 focus-within:ring-gray-700">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSubmit(e);
                    }
                  }}
                  placeholder="Continue the conversation..."
                  disabled={isLoading}
                  className="w-full bg-transparent text-gray-200 placeholder-gray-500 text-sm p-3 resize-none focus:outline-none min-h-[48px]"
                  rows={1}
                />
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <Tooltip content="Add attachment">
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#333] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                        aria-label="Add attachment"
                      >
                        <Plus size={18} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Use voice input">
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-300 hover:bg-[#333] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                        aria-label="Use voice input"
                      >
                        <Mic size={18} />
                      </button>
                    </Tooltip>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`bg-orange-900/50 text-orange-500 hover:bg-orange-900/80 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${isLoading ? "pl-3" : ""}`}
                  >
                    {isLoading && <Loader2 size={14} className="animate-spin" />}
                    {isLoading ? "Writing..." : "Start writing"}
                  </button>
                </div>
              </div>
            </form>
            <div className="flex justify-between items-center mt-2 px-1">
              <p className="text-[10px] text-gray-600">
                AI can make mistakes. Please review generated text.
              </p>
              <p className="text-[10px] text-gray-500 font-mono">
                {charCount} characters · {wordCount} words
              </p>
            </div>
          </div>
        </div>
        {/* Toggle button when draft panel is closed */}
        {!showDraftPanel && visibleDrafts.length > 0 && (
          <button
            onClick={() => setShowDraftPanel(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-[#262626] border border-[#333] border-r-0 hover:border-[#444] px-3 py-2 rounded-l-lg text-gray-400 hover:text-gray-200 transition-colors shadow-lg z-40"
            title="Show drafts"
          >
            <ChevronLeft size={16} />
            <FileText size={14} />
            <span className="text-xs font-medium">{visibleDrafts.length}</span>
          </button>
        )}
      </main>

      {/* Draft Panel */}
      {showDraftPanel && visibleDrafts.length > 0 && (
        <DraftPanel
          drafts={visibleDrafts}
          sessionId={sessionId}
          onClose={() => setShowDraftPanel(false)}
          onHideDraft={(draftId) => hideDraft(draftId)}
        />
      )}
    </div>
  );
}
