import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';

// Base selectors
export const selectCanvas = (state: RootState) => state.canvas;
export const selectSelectedElement = (state: RootState) => state.canvas.selectedElement;
export const selectCanvasState = (state: RootState) => state.canvas.canvasState;
export const selectHistory = (state: RootState) => state.canvas.history;
export const selectHistoryIndex = (state: RootState) => state.canvas.historyIndex;

// Share Modal selectors
export const selectShareModal = createSelector(
  [selectCanvas],
  (canvas) => canvas.shareModal
);

export const selectShareModalIsOpen = createSelector(
  [selectShareModal],
  (shareModal) => shareModal.isOpen
);

export const selectShareModalUsers = createSelector(
  [selectShareModal],
  (shareModal) => shareModal.users
);

export const selectShareModalSelectedUsers = createSelector(
  [selectShareModal],
  (shareModal) => shareModal.selectedUsers
);

export const selectShareModalLoading = createSelector(
  [selectShareModal],
  (shareModal) => shareModal.loading
);

export const selectShareModalSharing = createSelector(
  [selectShareModal],
  (shareModal) => shareModal.sharing
);

export const selectShareModalError = createSelector(
  [selectShareModal],
  (shareModal) => shareModal.error
);

export const selectShareModalSelectedRole = createSelector(
  [selectShareModal],
  (shareModal) => shareModal.selectedRole
);

// Comment Persistence selectors
export const selectCommentPersistence = createSelector(
  [selectCanvas],
  (canvas) => canvas.commentPersistence
);

export const selectCommentPersistenceInitialized = createSelector(
  [selectCommentPersistence],
  (commentPersistence) => commentPersistence.isInitialized
);

export const selectSavingComments = createSelector(
  [selectCommentPersistence],
  (commentPersistence) => commentPersistence.savingComments
);

export const selectCommentPersistenceError = createSelector(
  [selectCommentPersistence],
  (commentPersistence) => commentPersistence.error
);

// Users selectors
export const selectUsers = createSelector(
  [selectCanvas],
  (canvas) => canvas.users
);

export const selectUsersList = createSelector(
  [selectUsers],
  (users) => users.users
);

export const selectUsersLoading = createSelector(
  [selectUsers],
  (users) => users.loading
);

export const selectUsersError = createSelector(
  [selectUsers],
  (users) => users.error
);

// UI State selectors (will be added after UI state is moved to Redux)
export const selectUI = createSelector(
  [selectCanvas],
  (canvas) => canvas.ui
);

export const selectActivePanel = createSelector(
  [selectUI],
  (ui) => ui?.activePanel || null
);

export const selectLayersCollapsed = createSelector(
  [selectUI],
  (ui) => ui?.layersCollapsed || false
);

export const selectEditingLayerId = createSelector(
  [selectUI],
  (ui) => ui?.editingLayerId || null
);

// Computed selectors
export const selectCanUndo = createSelector(
  [selectHistoryIndex],
  (historyIndex) => historyIndex > 0
);

export const selectCanRedo = createSelector(
  [selectHistory, selectHistoryIndex],
  (history, historyIndex) => historyIndex < history.length - 1
);

export const selectSelectedElementType = createSelector(
  [selectSelectedElement],
  (selectedElement) => selectedElement?.type || null
);

export const selectSelectedElementColor = createSelector(
  [selectSelectedElement],
  (selectedElement) => selectedElement?.color || null
);

// Share Modal computed selectors
export const selectShareModalSelectedUsersCount = createSelector(
  [selectShareModalSelectedUsers],
  (selectedUsers) => selectedUsers.length
);

export const selectShareModalCanShare = createSelector(
  [selectShareModalSelectedUsersCount, selectShareModalSharing],
  (selectedCount, sharing) => selectedCount > 0 && !sharing
);

// Comment Persistence computed selectors
export const selectIsCommentBeingSaved = createSelector(
  [selectSavingComments],
  (savingComments) => (commentId: string) => savingComments.includes(commentId)
);
