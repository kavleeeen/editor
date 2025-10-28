import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchUsers, shareCanvasMultiple, createComment, fetchComments } from '../services/canvasApi';
import type { Comment } from '../services/canvasApi';

interface SelectedElement {
  type: 'textbox' | 'rect' | 'circle' | 'image' | 'triangle' | 'ellipse' | 'polygon' | null;
  objectId: string | null;
  color?: string;
}

interface User {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ShareModalState {
  isOpen: boolean;
  users: User[];
  selectedUsers: string[];
  selectedRole: 'editor' | 'viewer' | 'owner';
  loading: boolean;
  sharing: boolean;
  error: string | null;
}

interface CommentPersistenceState {
  isInitialized: boolean;
  savingComments: string[]; // Track which comments are being saved (changed from Set to array)
  error: string | null;
}

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

interface UIState {
  activePanel: 'font' | 'color' | 'shapes' | null;
  layersCollapsed: boolean;
  editingLayerId: string | null;
}

interface CanvasState {
  canvasState: string | null;
  selectedElement: SelectedElement | null;
  history: string[];
  historyIndex: number;
  shareModal: ShareModalState;
  commentPersistence: CommentPersistenceState;
  users: UserState;
  ui: UIState;
}

const initialState: CanvasState = {
  canvasState: null,
  selectedElement: null,
  history: [],
  historyIndex: -1,
  shareModal: {
    isOpen: false,
    users: [],
    selectedUsers: [],
    selectedRole: 'editor',
    loading: false,
    sharing: false,
    error: null,
  },
  commentPersistence: {
    isInitialized: false,
    savingComments: [],
    error: null,
  },
  users: {
    users: [],
    loading: false,
    error: null,
  },
  ui: {
    activePanel: null,
    layersCollapsed: false,
    editingLayerId: null,
  },
};

// Async thunks
export const fetchUsersAsync = createAsyncThunk(
  'canvas/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchUsers();
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch users');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch users');
    }
  }
);

export const shareCanvasAsync = createAsyncThunk(
  'canvas/shareCanvas',
  async ({ canvasId, userIds, role }: { canvasId: string; userIds: string[]; role: 'editor' | 'viewer' | 'owner' }, { rejectWithValue }) => {
    try {
      const response = await shareCanvasMultiple(canvasId, userIds, role);
      if (response.success) {
        return response;
      } else {
        return rejectWithValue(response.message || 'Failed to share canvas');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to share canvas');
    }
  }
);

export const createCommentAsync = createAsyncThunk(
  'canvas/createComment',
  async ({ canvasId, comment }: { canvasId: string; comment: Comment }, { rejectWithValue }) => {
    try {
      const response = await createComment(canvasId, comment);
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to create comment');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create comment');
    }
  }
);

export const fetchCommentsAsync = createAsyncThunk(
  'canvas/fetchComments',
  async (canvasId: string, { rejectWithValue }) => {
    try {
      const response = await fetchComments(canvasId);
      if (response.success) {
        return response.data?.comments || [];
      } else {
        return rejectWithValue(response.message || 'Failed to fetch comments');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch comments');
    }
  }
);

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    updateCanvasState: (state, action: PayloadAction<string>) => {
      state.canvasState = action.payload;
    },
    loadCanvasState: (state, action: PayloadAction<string>) => {
      state.canvasState = action.payload;
    },
    setSelectedElement: (state, action: PayloadAction<SelectedElement | null>) => {
      state.selectedElement = action.payload;
    },
    updateSelectedElement: (state, action: PayloadAction<Partial<SelectedElement>>) => {
      if (state.selectedElement) {
        state.selectedElement = { ...state.selectedElement, ...action.payload };
      }
    },
    updateSelectedElementColor: (state, action: PayloadAction<string>) => {
      if (state.selectedElement) {
        state.selectedElement.color = action.payload;
      }
    },
    saveToHistory: (state, action: PayloadAction<Record<string, unknown> | string>) => {
      // Accept object or string - store as string
      const payloadStr = typeof action.payload === 'string'
        ? action.payload
        : JSON.stringify(action.payload, null, 0); // Normalize by removing whitespace

      // Dedupe: skip if identical to last snapshot
      if (state.history.length > 0) {
        const last = state.history[state.history.length - 1];
        if (last === payloadStr) {
          return;
        }
      }

      // Cut off redo states
      const nextIndex = state.historyIndex + 1;
      state.history = state.history.slice(0, nextIndex);

      // Add new state to history
      state.history.push(payloadStr);
      state.historyIndex = state.history.length - 1;

      // Limit history to 10 states
      if (state.history.length > 10) {
        state.history.shift();
        state.historyIndex = state.history.length - 1;
      }
    },
    undo: (state) => {
      if (state.historyIndex > 0 && state.history.length > 0) {
        const currentState = state.history[state.historyIndex];
        let targetIndex = state.historyIndex - 1;

        // Skip duplicates and find next unique state
        while (targetIndex >= 0) {
          const prevState = state.history[targetIndex];
          if (prevState === currentState) {
            targetIndex--;
          } else {
            break; // Found unique state
          }
        }

        if (targetIndex >= 0) {
          state.historyIndex = targetIndex;
          state.canvasState = state.history[state.historyIndex];
        }
      }
    },
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1 && state.history.length > 0) {
        const currentState = state.history[state.historyIndex];
        let targetIndex = state.historyIndex + 1;

        // Skip duplicates and find next unique state
        while (targetIndex < state.history.length) {
          const nextState = state.history[targetIndex];
          if (nextState === currentState) {
            targetIndex++;
          } else {
            break; // Found unique state
          }
        }

        if (targetIndex < state.history.length) {
          state.historyIndex = targetIndex;
          state.canvasState = state.history[state.historyIndex];
        }
      }
    },
    clearHistory: (state) => {
      state.history = [];
      state.historyIndex = -1;
    },
    // Share Modal Actions
    openShareModal: (state) => {
      state.shareModal.isOpen = true;
      state.shareModal.error = null;
    },
    closeShareModal: (state) => {
      state.shareModal.isOpen = false;
      state.shareModal.selectedUsers = [];
      state.shareModal.selectedRole = 'editor';
      state.shareModal.error = null;
    },
    setShareModalUsers: (state, action: PayloadAction<User[]>) => {
      state.shareModal.users = action.payload;
    },
    setShareModalLoading: (state, action: PayloadAction<boolean>) => {
      state.shareModal.loading = action.payload;
    },
    setShareModalSharing: (state, action: PayloadAction<boolean>) => {
      state.shareModal.sharing = action.payload;
    },
    setShareModalError: (state, action: PayloadAction<string | null>) => {
      state.shareModal.error = action.payload;
    },
    toggleSelectedUser: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      const selectedUsers = state.shareModal.selectedUsers;
      if (selectedUsers.includes(userId)) {
        state.shareModal.selectedUsers = selectedUsers.filter(id => id !== userId);
      } else {
        state.shareModal.selectedUsers = [...selectedUsers, userId];
      }
    },
    setSelectedRole: (state, action: PayloadAction<'editor' | 'viewer' | 'owner'>) => {
      state.shareModal.selectedRole = action.payload;
    },

    // Comment persistence reducers
    setCommentPersistenceInitialized: (state, action: PayloadAction<boolean>) => {
      state.commentPersistence.isInitialized = action.payload;
    },
    addSavingComment: (state, action: PayloadAction<string>) => {
      if (!state.commentPersistence.savingComments.includes(action.payload)) {
        state.commentPersistence.savingComments.push(action.payload);
      }
    },
    removeSavingComment: (state, action: PayloadAction<string>) => {
      state.commentPersistence.savingComments = state.commentPersistence.savingComments.filter(
        id => id !== action.payload
      );
    },
    setCommentPersistenceError: (state, action: PayloadAction<string | null>) => {
      state.commentPersistence.error = action.payload;
    },
    clearCommentPersistenceError: (state) => {
      state.commentPersistence.error = null;
    },

    // User management reducers
    setUsersLoading: (state, action: PayloadAction<boolean>) => {
      state.users.loading = action.payload;
    },
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users.users = action.payload;
      state.users.loading = false;
      state.users.error = null;
    },
    setUsersError: (state, action: PayloadAction<string | null>) => {
      state.users.error = action.payload;
      state.users.loading = false;
    },

    // UI State reducers
    setActivePanel: (state, action: PayloadAction<'font' | 'color' | 'shapes' | null>) => {
      state.ui.activePanel = action.payload;
    },
    setLayersCollapsed: (state, action: PayloadAction<boolean>) => {
      state.ui.layersCollapsed = action.payload;
    },
    setEditingLayerId: (state, action: PayloadAction<string | null>) => {
      state.ui.editingLayerId = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Users
    builder
      .addCase(fetchUsersAsync.pending, (state) => {
        state.users.loading = true;
        state.users.error = null;
      })
      .addCase(fetchUsersAsync.fulfilled, (state, action) => {
        state.users.users = action.payload;
        state.users.loading = false;
        state.users.error = null;
      })
      .addCase(fetchUsersAsync.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload as string;
      });

    // Share Canvas
    builder
      .addCase(shareCanvasAsync.pending, (state) => {
        state.shareModal.sharing = true;
        state.shareModal.error = null;
      })
      .addCase(shareCanvasAsync.fulfilled, (state) => {
        state.shareModal.sharing = false;
        state.shareModal.error = null;
      })
      .addCase(shareCanvasAsync.rejected, (state, action) => {
        state.shareModal.sharing = false;
        state.shareModal.error = action.payload as string;
      });

    // Create Comment
    builder
      .addCase(createCommentAsync.pending, (state, action) => {
        const commentId = action.meta.arg.comment.id;
        if (!state.commentPersistence.savingComments.includes(commentId)) {
          state.commentPersistence.savingComments.push(commentId);
        }
        state.commentPersistence.error = null;
      })
      .addCase(createCommentAsync.fulfilled, (state, action) => {
        const commentId = action.meta.arg.comment.id;
        state.commentPersistence.savingComments = state.commentPersistence.savingComments.filter(
          id => id !== commentId
        );
        state.commentPersistence.error = null;
      })
      .addCase(createCommentAsync.rejected, (state, action) => {
        const commentId = action.meta.arg.comment.id;
        state.commentPersistence.savingComments = state.commentPersistence.savingComments.filter(
          id => id !== commentId
        );
        state.commentPersistence.error = action.payload as string;
      });

    // Fetch Comments
    builder
      .addCase(fetchCommentsAsync.pending, (state) => {
        state.commentPersistence.error = null;
      })
      .addCase(fetchCommentsAsync.fulfilled, (state) => {
        state.commentPersistence.isInitialized = true;
        state.commentPersistence.error = null;
      })
      .addCase(fetchCommentsAsync.rejected, (state, action) => {
        state.commentPersistence.isInitialized = true;
        state.commentPersistence.error = action.payload as string;
      });
  },
});

export const {
  updateCanvasState,
  loadCanvasState,
  setSelectedElement,
  updateSelectedElement,
  updateSelectedElementColor,
  saveToHistory,
  undo,
  redo,
  clearHistory,
  openShareModal,
  closeShareModal,
  setShareModalUsers,
  setShareModalLoading,
  setShareModalSharing,
  setShareModalError,
  toggleSelectedUser,
  setSelectedRole,
  setCommentPersistenceInitialized,
  addSavingComment,
  removeSavingComment,
  setCommentPersistenceError,
  clearCommentPersistenceError,
  setUsersLoading,
  setUsers,
  setUsersError,
  setActivePanel,
  setLayersCollapsed,
  setEditingLayerId
} = canvasSlice.actions;
export default canvasSlice.reducer;

