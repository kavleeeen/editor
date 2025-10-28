import React, { useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { useDispatch, useSelector } from 'react-redux';
import { shareCanvasMultiple, fetchUsers } from '../../services/canvasApi';
import { getUserFromToken } from '../../services/authApi';
import {
  closeShareModal,
  setShareModalUsers,
  setShareModalLoading,
  setShareModalSharing,
  setShareModalError,
  toggleSelectedUser,
  setSelectedRole
} from '../../store/canvasSlice';
import type { RootState } from '../../store/store';
import './ShareModal.css';

interface ShareModalProps {
  canvasId: string;
  canvasTitle?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ canvasId, canvasTitle }) => {
  const dispatch = useDispatch();
  const {
    isOpen,
    users,
    selectedUsers,
    selectedRole,
    loading,
    sharing,
    error
  } = useSelector((state: RootState) => state.canvas.shareModal);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      dispatch(setShareModalLoading(true));
      dispatch(setShareModalError(null));
      const response = await fetchUsers();
      if (response.success) {
        // Get current user to filter them out
        const currentUser = getUserFromToken();
        console.log({ currentUser });
        const filteredUsers = currentUser
          ? response.data.filter(user => user._id !== currentUser.id)
          : response.data;

        dispatch(setShareModalUsers(filteredUsers));
      } else {
        dispatch(setShareModalError('Failed to load users'));
      }
    } catch (err) {
      console.error('Error loading users:', err);
      dispatch(setShareModalError('Failed to load users'));
    } finally {
      dispatch(setShareModalLoading(false));
    }
  };

  const handleUserToggle = (userId: string) => {
    dispatch(toggleSelectedUser(userId));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      dispatch(setShareModalError('Please select at least one user to share with'));
      return;
    }

    try {
      dispatch(setShareModalSharing(true));
      dispatch(setShareModalError(null));

      const response = await shareCanvasMultiple(canvasId, selectedUsers, selectedRole);

      if (response.success) {
        alert(`Canvas "${canvasTitle || 'Untitled'}" shared successfully with ${selectedUsers.length} user(s) as ${selectedRole}(s)!`);
        dispatch(closeShareModal());
      } else {
        dispatch(setShareModalError(response.message || 'Failed to share canvas'));
      }
    } catch (err) {
      console.error('Error sharing canvas:', err);
      dispatch(setShareModalError('Failed to share canvas. Please try again.'));
    } finally {
      dispatch(setShareModalSharing(false));
    }
  };

  const handleClose = () => {
    dispatch(closeShareModal());
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay">
      <div className="share-modal">
        <div className="share-modal-header">
          <h2>Share Canvas</h2>
          <button className="close-button" onClick={handleClose}>
            <IoClose size={24} />
          </button>
        </div>

        <div className="share-modal-content">
          <div className="canvas-info">
            <h3>{canvasTitle || 'Untitled Canvas'}</h3>
            <p>Select users to share this canvas with</p>
          </div>



          <div className="users-section">
            <h4>Select Users ({selectedUsers.length} selected)</h4>

            {loading ? (
              <div className="loading">Loading users...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <div className="users-list">
                {users.length === 0 ? (
                  <div className="no-users">No users found</div>
                ) : (
                  users.map(user => (
                    <div key={user._id} className="user-item">
                      <label className="user-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => handleUserToggle(user._id)}
                        />
                        <div className="user-info">
                          <span className="user-name">{user.name || 'Unnamed User'}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {error && !loading && (
            <div className="error-message">{error}</div>
          )}
        </div>

        <div className="share-modal-footer">
          <button
            className="cancel-button"
            onClick={handleClose}
            disabled={sharing}
          >
            Cancel
          </button>
          <button
            className="share-button"
            onClick={handleShare}
            disabled={sharing || selectedUsers.length === 0}
          >
            {sharing ? 'Sharing...' : `Share with ${selectedUsers.length} user(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;