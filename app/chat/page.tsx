"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Menu, X, LogOut } from "lucide-react";
import { Sidebar } from "@/components/spiral/sidebar";
import { ChatInterface } from "@/components/spiral/chat-interface";

export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { signOut } = useAuthActions();
  const user = useQuery(api.users.viewer);
  const userId = user?._id;

  const sessions = useQuery(api.sessions.list, userId ? { userId: userId } : "skip");
  const createSession = useMutation(api.sessions.create);

  const handleNewSession = async () => {
    if (!userId) return;
    const sessionId = await createSession({
      userId: userId,
      title: "New Session",
      contentType: "blog",
    });
    setActiveSessionId(sessionId);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSelectSession = (sessionId: Id<"sessions">) => {
    setActiveSessionId(sessionId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#1a1a1a] text-gray-200 font-sans overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden absolute top-4 left-4 z-30 p-2 text-gray-400 hover:text-white bg-[#262626] rounded-md shadow-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Drawer on mobile, fixed on desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#121212] transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:block h-full
          ${isSidebarCollapsed ? "md:w-[60px]" : "md:w-[280px]"} w-[280px]
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="relative h-full">
          {/* Close button for mobile drawer */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-white z-50 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
          <Sidebar
            sessions={sessions ?? []}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeSessionId && userId ? (
        <ChatInterface sessionId={activeSessionId} userId={userId} />
      ) : (
        <EmptyState onNewSession={handleNewSession} />
      )}

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-[#262626] hover:bg-[#333] border border-[#333] rounded-lg text-gray-400 hover:text-gray-200 text-sm transition-colors"
        title="Sign out"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}

function EmptyState({ onNewSession }: { onNewSession: () => void }) {
  return (
    <main className="flex-1 bg-[#1a1a1a] flex flex-col h-full relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="max-w-md text-center">
          {/* Spiral Logo */}
          <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-900/30">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-100 mb-4">Spiral</h1>
          <p className="text-gray-400 mb-8">
            Your AI writing partner. Start a conversation and I&apos;ll help you craft tweets, blog
            posts, emails, and essays.
          </p>
          <button
            onClick={onNewSession}
            className="px-6 py-3 bg-orange-900/50 text-orange-500 hover:bg-orange-900/80 rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            Start Writing
          </button>
        </div>
      </div>
    </main>
  );
}
