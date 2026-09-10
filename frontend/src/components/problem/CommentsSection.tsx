import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  MessageSquare,
  Send,
  CornerDownRight,
  Trash2,
  Flag,
  AlertCircle,
  Clock,
} from "lucide-react";

interface CommentAuthor {
  id: string;
  name: string;
  role: string;
  district?: string | null;
}

export interface ProblemCommentItem {
  id: string;
  problemId: string;
  authorId: string;
  parentId?: string | null;
  content: string;
  isReported: boolean;
  createdAt: string;
  author: CommentAuthor;
  replies?: ProblemCommentItem[];
}

interface CommentsSectionProps {
  problemId: string;
  onCommentCountChange?: (count: number) => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  problemId,
  onCommentCountChange,
}) => {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<ProblemCommentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/problems/${problemId}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setComments(data.comments || []);
          setTotalCount(data.count || 0);
          if (onCommentCountChange) {
            onCommentCountChange(data.count || 0);
          }
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [problemId, token, onCommentCountChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (parentId?: string) => {
    if (!token) {
      setFeedback("Please sign in to participate in the community discussion.");
      return;
    }

    const textToSubmit = parentId ? replyText.trim() : newCommentText.trim();
    if (!textToSubmit || textToSubmit.length < 2) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API_BASE_URL}/problems/${problemId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: textToSubmit,
          parentId: parentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post comment.");
      }

      if (parentId) {
        setReplyText("");
        setReplyingToId(null);
      } else {
        setNewCommentText("");
      }

      await fetchComments();
    } catch (err: any) {
      setFeedback(err.message || "Failed to submit comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token || !window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchComments();
      }
    } catch {
      // Non-blocking
    }
  };

  const handleReportComment = async (commentId: string) => {
    if (!token) return;
    const reason = window.prompt("Please briefly describe why this comment is inappropriate:");
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/comments/${commentId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.ok) {
        alert("Thank you. The comment has been flagged for administrative review.");
        await fetchComments();
      }
    } catch {
      // Non-blocking
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Community Discussion</h3>
            <p className="text-[11px] text-slate-500">
              {totalCount} {totalCount === 1 ? "comment" : "comments"} from verified citizens and solvers
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Comment Input Box */}
      {user ? (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              rows={3}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Share ground reality, community context, or suggest actionable steps..."
              maxLength={1500}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {newCommentText.length}/1500 characters
            </span>
            <button
              onClick={() => handlePostComment()}
              disabled={isSubmitting || newCommentText.trim().length < 2}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 min-h-[40px]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Posting..." : "Post Comment"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
          Sign in to post comments and join the civic dialogue.
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-4 pt-2">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Loading community discussion...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No comments yet. Be the first to share an observation or question!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* Top-level Comment Card */}
              <div
                className={`p-3.5 rounded-xl border transition-colors ${
                  comment.isReported
                    ? "bg-amber-50/50 border-amber-200"
                    : "bg-slate-50 border-slate-200/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      {comment.author.name?.charAt(0) || "C"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {comment.author.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 font-medium">
                          {comment.author.role}
                        </span>
                        {comment.author.district && (
                          <span className="text-[10px] text-slate-500">
                            • {comment.author.district}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(comment.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Delete & Report */}
                  <div className="flex items-center gap-1">
                    {user && (user.id === comment.authorId || user.role === "ADMIN") && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Delete comment"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {user && user.id !== comment.authorId && (
                      <button
                        onClick={() => handleReportComment(comment.id)}
                        title="Report inappropriate comment"
                        className="p-1.5 text-slate-400 hover:text-amber-600 rounded transition-colors"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>

                {comment.isReported && (
                  <p className="text-[10px] text-amber-700 mt-1 font-medium italic">
                    ⚠️ Flagged for moderation review
                  </p>
                )}

                {/* Reply trigger */}
                {user && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() =>
                        setReplyingToId(replyingToId === comment.id ? null : comment.id)
                      }
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>{replyingToId === comment.id ? "Cancel Reply" : "Reply"}</span>
                    </button>
                  </div>
                )}

                {/* Inline Reply Input */}
                {replyingToId === comment.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${comment.author.name}...`}
                      maxLength={1000}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingToId(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handlePostComment(comment.id)}
                        disabled={isSubmitting || replyText.trim().length < 2}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
                      >
                        {isSubmitting ? "Replying..." : "Post Reply"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-6 sm:pl-8 space-y-2.5 border-l-2 border-slate-200 ml-3 sm:ml-4">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {reply.author.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">
                                {reply.author.name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {reply.author.role}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400">
                              {new Date(reply.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {user && (user.id === reply.authorId || user.role === "ADMIN") && (
                          <button
                            onClick={() => handleDeleteComment(reply.id)}
                            title="Delete reply"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-wrap leading-relaxed">
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
