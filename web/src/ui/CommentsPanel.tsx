import React, { useState } from 'react';
import type { Comment } from '@whiteboard/shared';

interface CommentsPanelProps {
  comments: Comment[];
  onResolve: (id: string) => void;
  onReply: (commentId: string, text: string) => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ comments, onResolve, onReply }) => {
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [activeReply, setActiveReply] = useState<string | null>(null);

  const unresolved = comments.filter(c => !c.resolved);
  const resolved = comments.filter(c => c.resolved);

  return (
    <div className="panel comments-panel">
      <h3 className="panel-title">Comments ({unresolved.length})</h3>
      <div className="comments-list">
        {unresolved.length === 0 && resolved.length === 0 && (
          <div className="comments-empty">No comments yet. Press C to add a comment.</div>
        )}

        {[...unresolved, ...resolved].map(comment => (
          <div key={comment.id} className={`comment-item ${comment.resolved ? 'resolved' : ''}`}>
            <div className="comment-header">
              <span className="comment-author" style={{ color: getAuthorColor(comment.author) }}>
                ● {comment.author}
              </span>
              <span className="comment-time">{formatTime(comment.createdAt)}</span>
            </div>
            <div className="comment-body">{comment.text}</div>

            {comment.replies.length > 0 && (
              <div className="comment-replies">
                {comment.replies.map(reply => (
                  <div key={reply.id} className="comment-reply">
                    <span className="reply-author">{reply.author}:</span> {reply.text}
                  </div>
                ))}
              </div>
            )}

            <div className="comment-actions">
              {!comment.resolved && (
                <>
                  <button onClick={() => onResolve(comment.id)}>✓ Resolve</button>
                  <button onClick={() => setActiveReply(activeReply === comment.id ? null : comment.id)}>
                    ↩ Reply
                  </button>
                </>
              )}
            </div>

            {activeReply === comment.id && (
              <div className="reply-input">
                <input
                  placeholder="Write a reply..."
                  value={replyText[comment.id] || ''}
                  onChange={e => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && replyText[comment.id]) {
                      onReply(comment.id, replyText[comment.id]);
                      setReplyText({ ...replyText, [comment.id]: '' });
                      setActiveReply(null);
                    }
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AUTHOR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#F7DC6F'];

function getAuthorColor(author: string): string {
  let hash = 0;
  for (let i = 0; i < author.length; i++) {
    hash = author.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length];
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
