import { useEffect, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { saveCanvas } from '../../services/canvasApi';
import './UndoRedoToolbar.css';

interface UndoRedoToolbarProps {
  canvas?: any;
}

const UndoRedoToolbar = ({ }: UndoRedoToolbarProps) => {
  const { id } = useParams<{ id: string }>();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas) return;

    const updateButtons = () => {
      setCanUndo((canvas.historyUndo?.length || 0) > 0);
      setCanRedo((canvas.historyRedo?.length || 0) > 0);
    };

    // Poll for button state updates since we don't have custom events
    const interval = setInterval(updateButtons, 100);

    // Initial update
    updateButtons();

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleUndo = useCallback(() => {
    console.log('⚡ handleUndo clicked');
    const canvas = (window as any).fabricCanvas;
    if (canvas && canvas.historyUndoAction) {
      canvas.historyUndoAction();
    }
  }, []);

  const handleRedo = useCallback(() => {
    console.log('⚡ handleRedo clicked');
    const canvas = (window as any).fabricCanvas;
    if (canvas && canvas.historyRedoAction) {
      canvas.historyRedoAction();
    }
  }, []);

  const handleSave = useCallback(async () => {
    const canvas = (window as any).fabricCanvas;
    if (!canvas || !id) return;

    setIsSaving(true);
    try {
      const designData = canvas.toJSON();

      // Add canvas dimensions
      designData.width = canvas.getWidth();
      designData.height = canvas.getHeight();

      const result = await saveCanvas(id, {
        designData,
        metadata: {
          title: 'My Design'
        }
      });

      if (result.success) {
        console.log('✅ Canvas saved successfully');
        alert('Canvas saved successfully!');
      } else {
        console.error('❌ Failed to save canvas:', result);
        alert('Failed to save canvas');
      }
    } catch (error) {
      console.error('❌ Error saving canvas:', error);
      alert('Error saving canvas');
    } finally {
      setIsSaving(false);
    }
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo) {
          handleRedo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (canUndo) {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) {
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, handleUndo, handleRedo]);

  return (
    <div className="undo-redo-toolbar">
      <button
        className="undo-redo-btn"
        onClick={handleUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      </button>
      <button
        className="undo-redo-btn"
        onClick={handleRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 1 1 18 0 9 9 0 0 1-18 0z" />
        </svg>
      </button>
      <button
        className="undo-redo-btn save-btn"
        onClick={handleSave}
        disabled={isSaving}
        title="Save Canvas"
      >
        {isSaving ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinning">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default UndoRedoToolbar;
