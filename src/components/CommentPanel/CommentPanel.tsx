import { useState, useEffect, useRef } from 'react'
import { MentionsInput, Mention } from 'react-mentions'
import { useDispatch, useSelector } from 'react-redux'
import { getUserFromToken } from '../../services/authApi'
import { type Comment } from '../../services/canvasApi'
import {
  setCommentPersistenceError,
  clearCommentPersistenceError,
  fetchUsersAsync,
  createCommentAsync,
  fetchCommentsAsync
} from '../../store/canvasSlice'
import type { AppDispatch } from '../../store/store'
import { selectCommentPersistenceInitialized, selectSavingComments, selectUsersList } from '../../store/selectors'
import './CommentPanel.css'

interface CommentPanelProps {
  canvasId: string
}

export default function CommentPanel({ canvasId }: CommentPanelProps) {
  const dispatch = useDispatch<AppDispatch>()
  const [isOpen, setIsOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Redux state for comment persistence
  const isInitialized = useSelector(selectCommentPersistenceInitialized)
  const savingComments = useSelector(selectSavingComments)
  const users = useSelector(selectUsersList)
  const currentUser = getUserFromToken();

  // Convert users from store to mention format
  const mentionUsers = users.map(user => ({
    id: user._id,
    display: user.name
  }))?.filter((user: any) => user.id !== currentUser?.id)

  // Fetch users when component mounts
  useEffect(() => {
    dispatch(fetchUsersAsync())
  }, [dispatch])

  // Scroll to bottom when new comments arrive
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [comments])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Initial comment loading (only once when canvas loads)
  useEffect(() => {
    if (!canvasId || isInitialized) return

    const loadInitialComments = async () => {
      try {
        dispatch(clearCommentPersistenceError())
        const loadedComments = await dispatch(fetchCommentsAsync(canvasId)).unwrap()

        // Load comments into Yjs array
        const ydoc = (window as any).ydoc
        if (ydoc) {
          const yComments = ydoc.getArray(`comments-${canvasId}`)
          // Clear existing comments and add loaded ones
          yComments.delete(0, yComments.length)
          if (Array.isArray(loadedComments) && loadedComments.length > 0) {
            // Push as a single batch to avoid multiple updates
            yComments.push(loadedComments)
          }
          // Comments will be reflected via the Yjs observer below
        }
      } catch (error) {
        console.error('Failed to load initial comments:', error)
        dispatch(setCommentPersistenceError('Failed to load comments'))
      }
    }

    loadInitialComments()
  }, [canvasId, isInitialized, dispatch])

  // Yjs integration for real-time comments
  useEffect(() => {
    if (!canvasId) return

    // Wait for ydoc to be available
    const setupComments = () => {
      const ydoc = (window as any).ydoc
      if (!ydoc) {
        setTimeout(setupComments, 100)
        return
      }

      // Create shared array for comments
      const yComments = ydoc.getArray(`comments-${canvasId}`)
      setIsConnected(true)

      // Update comments when Yjs array changes
      const updateComments = () => {
        const commentsArray = yComments.toArray()
        // Sort by timestamp (oldest first)
        const sortedComments = commentsArray.sort((a: Comment, b: Comment) => a.timestamp - b.timestamp)
        setComments(sortedComments)
      }

      // Initial load
      updateComments()

      // Observe changes
      yComments.observe(updateComments)

        // Store reference for sending comments
        ; (window as any).yComments = yComments

      return () => {
        yComments.unobserve(updateComments)
      }
    }

    const cleanup = setupComments()
    return cleanup
  }, [canvasId])

  const handleSendComment = async () => {
    if (!newComment.trim()) return

    const ydoc = (window as any).ydoc
    const yComments = (window as any).yComments
    if (!ydoc || !yComments) return

    const user = getUserFromToken()
    const comment: Comment = {
      id: `${ydoc.clientID}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      authorId: user?.id || 'guest',
      timestamp: Date.now(),
      text: newComment.trim()
    }

    // Add comment to Yjs array first (for immediate UI update)
    yComments.push([comment])
    setNewComment('')

    // Save to backend using async thunk
    if (!savingComments.includes(comment.id)) {
      try {
        await dispatch(createCommentAsync({ canvasId, comment })).unwrap()
      } catch (error) {
        console.error('Failed to save comment:', error)
        dispatch(setCommentPersistenceError('Failed to save comment'))
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendComment()
    }
  }
  // Render mentions inside comment text in a simple way: @[Display](id) -> @Display
  const renderCommentText = (text: string) => {
    const parts: Array<string | { display: string; id: string }> = []
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      parts.push({ display: match[1], id: match[2] })
      lastIndex = regex.lastIndex
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return (
      <>
        {parts.map((part, idx) =>
          typeof part === 'string' ? (
            <span key={idx}>{part}</span>
          ) : (
            <span key={idx} className="mention-chip">@{part.display}</span>
          )
        )}
      </>
    )
  }


  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getUserById = (authorId: string) => {
    return users.find(user => user._id === authorId)
  }

  const getAuthorName = (authorId: string) => {
    const user = getUserById(authorId)
    return user?.name || authorId
  }

  const getAuthorInitials = (authorId: string) => {
    const user = getUserById(authorId)
    if (user?.name) {
      const parts = user.name.split(' ').filter(Boolean)
      const first = parts[0]?.[0] || ''
      const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
      return (first + last).toUpperCase() || first.toUpperCase()
    }
    // Fallback to first two characters of authorId
    return authorId.substring(0, 2).toUpperCase() || '??'
  }

  const getAuthorColor = (authorId: string) => {
    const colors = [
      '#FFB3BA', // Light pink
      '#BAFFC9', // Light green
      '#BAE1FF', // Light blue
      '#FFFFBA', // Light yellow
      '#FFDFBA'  // Light orange
    ]
    let hash = 0
    for (let i = 0;i < authorId.length;i++) {
      hash = authorId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="comment-panel">
      {/* Floating Comment Icon */}
      <button
        className={`comment-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Close comments' : 'Open comments'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {comments.length > 0 && (
          <span className="comment-count">{comments.length}</span>
        )}
      </button>

      {/* Comment Chat Panel */}
      {isOpen && (
        <div className="comment-chat">
          <div className="comment-header">
            <h3>Comments</h3>

          </div>

          <div className="comment-messages">
            {comments.length === 0 ? (
              <div className="no-comments">
                <p>No comments yet. Start the conversation!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-avatar">
                    <div
                      className="avatar-circle"
                      style={{ backgroundColor: getAuthorColor(comment.authorId) }}
                    >
                      {getAuthorInitials(comment.authorId)}
                    </div>
                  </div>
                  <div className="comment-content">
                    <div className="comment-meta">
                      <span className="comment-author">{getAuthorName(comment.authorId)}</span>
                      <span className="comment-time">{formatTimestamp(comment.timestamp)}</span>
                    </div>
                    <div className="comment-text">{renderCommentText(comment.text)}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          <div className="comment-input">
            <MentionsInput
              value={newComment}
              onChange={(_: any, v: string) => setNewComment(v)}
              placeholder={isConnected ? 'Add a comment' : 'Connecting...'}
              disabled={!isConnected}
              className="mentions"
              allowSuggestionsAboveCursor={true}
              inputRef={inputRef as any}
              onKeyDown={handleKeyPress}
            >
              <Mention
                trigger="@"
                data={mentionUsers}
                markup="@[__display__](__id__)"
                displayTransform={(_id: string, display: string) => `@${display}`}
                className="mentions__mention"
              />
            </MentionsInput>
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim() || !isConnected}
              className="send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9 22,2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
