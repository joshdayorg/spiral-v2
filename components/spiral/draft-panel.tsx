"use client";

import { useState, useMemo } from "react";

import { Doc, Id } from "../../convex/_generated/dataModel";
import { 
  X, 
  Plus, 
  ChevronRight, 
  Copy, 
  Check,
  FileText,
  Eye,
  EyeOff
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DraftPanelProps {
  drafts: Doc<"drafts">[];
  sessionId: Id<"sessions">;
  onClose: () => void;
  onHideDraft?: (draftId: Id<"drafts">) => void;
}

const MAX_OPEN_DRAFTS = 3;

export function DraftPanel({ drafts, sessionId, onClose, onHideDraft }: DraftPanelProps) {
  // Track which drafts are "open" in side-by-side view (max 3)
  const [manualOpenIds, setManualOpenIds] = useState<Id<"drafts">[]>([]);
  const [copiedId, setCopiedId] = useState<Id<"drafts"> | null>(null);

  // Compute valid open IDs based on current drafts
  const openDraftIds = useMemo(() => {
    // Filter to only IDs that still exist in drafts
    const validManual = manualOpenIds.filter(id => drafts.some(d => d._id === id));
    
    // If no manual selection or all manual selections invalid, auto-select first 3
    if (validManual.length === 0 && drafts.length > 0) {
      return drafts.slice(0, MAX_OPEN_DRAFTS).map(d => d._id);
    }
    
    return validManual;
  }, [drafts, manualOpenIds]);

  const openDrafts = drafts.filter(d => openDraftIds.includes(d._id));

  const handleCopy = async (draft: Doc<"drafts">) => {
    await navigator.clipboard.writeText(draft.content);
    setCopiedId(draft._id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleDraftOpen = (draftId: Id<"drafts">) => {
    setManualOpenIds(prev => {
      // Use current openDraftIds for logic since it includes auto-selected ones
      const currentOpen = prev.length > 0 ? prev : openDraftIds;
      
      if (currentOpen.includes(draftId)) {
        // Close it
        return currentOpen.filter(id => id !== draftId);
      } else if (currentOpen.length < MAX_OPEN_DRAFTS) {
        // Open it (have room)
        return [...currentOpen, draftId];
      } else {
        // Replace oldest with new one
        return [...currentOpen.slice(1), draftId];
      }
    });
  };

  const closeDraft = (draftId: Id<"drafts">) => {
    setManualOpenIds(prev => {
      const currentOpen = prev.length > 0 ? prev : openDraftIds;
      return currentOpen.filter(id => id !== draftId);
    });
  };

  return (
    <aside className="w-[750px] border-l border-[#333] bg-[#1a1a1a] flex flex-col h-full animate-slide-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-200 font-medium text-sm">Drafts</span>
          <span className="text-gray-500 text-sm">({drafts.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#262626] rounded transition-colors"
            title="Create new draft"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#262626] rounded transition-colors"
            title="Hide drafts (⌥B)"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Two-Part Layout */}
      {drafts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center mx-auto mb-3">
              <FileText size={18} className="text-gray-500" />
            </div>
            <p className="text-gray-500 text-sm">No drafts yet</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Draft List */}
          <div className="w-[160px] border-r border-[#333] flex flex-col">
            <div className="px-3 py-2 border-b border-[#333]">
              <span className="text-xs text-gray-500 uppercase tracking-wide">All Drafts</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {drafts.map((draft) => {
                const isOpen = openDraftIds.includes(draft._id);
                return (
                  <button
                    key={draft._id}
                    onClick={() => toggleDraftOpen(draft._id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 border-b border-[#262626] ${
                      isOpen
                        ? "bg-orange-500/10 text-orange-400"
                        : "text-gray-400 hover:bg-[#262626] hover:text-gray-200"
                    }`}
                    title={isOpen ? "Click to close" : "Click to open"}
                  >
                    {isOpen ? (
                      <Eye size={12} className="flex-shrink-0 text-orange-400" />
                    ) : (
                      <EyeOff size={12} className="flex-shrink-0 text-gray-500" />
                    )}
                    <span className="truncate flex-1">{draft.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-[#333] text-xs text-gray-500">
              {openDraftIds.length}/{MAX_OPEN_DRAFTS} open
            </div>
          </div>

          {/* Right: Side-by-Side View */}
          <div className="flex-1 flex overflow-hidden">
            {openDrafts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Select drafts to compare</p>
              </div>
            ) : (
              openDrafts.map((draft, index) => (
                <div
                  key={draft._id}
                  className={`flex-1 min-w-[180px] flex flex-col ${
                    index < openDrafts.length - 1 ? "border-r border-[#333]" : ""
                  }`}
                >
                  {/* Draft Header */}
                  <div className="p-3 border-b border-[#333]">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-medium leading-tight line-clamp-2 text-gray-200">
                        {draft.title}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCopy(draft)}
                          className="p-1 text-gray-500 hover:text-gray-300 hover:bg-[#262626] rounded transition-colors"
                          title="Copy content"
                        >
                          {copiedId === draft._id ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => closeDraft(draft._id)}
                          className="p-1 text-gray-500 hover:text-gray-300 hover:bg-[#262626] rounded transition-colors"
                          title="Close this draft"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs">
                      {draft.wordCount || draft.content.split(/\s+/).length} words
                    </p>
                  </div>

                  {/* Draft Content */}
                  <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                    <div className="prose-draft text-gray-300 text-xs leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-sm font-semibold text-gray-200 mb-2">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xs font-medium text-gray-200 mb-1.5 mt-3">{children}</h2>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 text-gray-300">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-gray-200">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-0.5 my-1.5">{children}</ul>
                          ),
                          li: ({ children }) => (
                            <li className="text-gray-300">{children}</li>
                          ),
                        }}
                      >
                        {draft.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
