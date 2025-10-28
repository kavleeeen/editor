import { useEffect, useCallback, useState } from 'react';
import './UndoRedoToolbar.css';

interface UndoRedoToolbarProps {
  canvas?: any;
  isLoadingCanvas?: boolean;
}

const UndoRedoToolbar = ({ isLoadingCanvas = false }: UndoRedoToolbarProps) => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    // Don't start listening until canvas is loaded
    if (isLoadingCanvas) return;

    const canvas = (window as any).fabricCanvas;
    const canvasReady = (window as any).canvasReady;
    if (!canvas || !canvasReady) return;

    const updateButtons = () => {
      setCanUndo((canvas.historyUndo?.length || 0) > 0);
      setCanRedo((canvas.historyRedo?.length || 0) > 0);
    };

    // Listen to canvas events that affect history
    const handleHistoryChange = () => {
      // Small delay to ensure canvas has finished processing
      setTimeout(updateButtons, 10);
    };

    // Listen to history events
    canvas.on('history:undo', handleHistoryChange);
    canvas.on('history:redo', handleHistoryChange);
    canvas.on('object:added', handleHistoryChange);
    canvas.on('object:removed', handleHistoryChange);
    canvas.on('object:modified', handleHistoryChange);

    // Initial update
    updateButtons();

    return () => {
      canvas.off('history:undo', handleHistoryChange);
      canvas.off('history:redo', handleHistoryChange);
      canvas.off('object:added', handleHistoryChange);
      canvas.off('object:removed', handleHistoryChange);
      canvas.off('object:modified', handleHistoryChange);
    };
  }, [isLoadingCanvas]);

  const handleUndo = useCallback(() => {
    console.log('⚡ handleUndo clicked');
    const canvas = (window as any).fabricCanvas;
    const canvasReady = (window as any).canvasReady;
    if (canvas && canvasReady && canvas.historyUndoAction) {
      canvas.historyUndoAction(() => {
        if ((canvas as any)._forceSync) {
          (canvas as any)._forceSync();
        }
      });
    }
  }, []);

  const handleRedo = useCallback(() => {
    console.log('⚡ handleRedo clicked');
    const canvas = (window as any).fabricCanvas;
    const canvasReady = (window as any).canvasReady;
    if (canvas && canvasReady && canvas.historyRedoAction) {
      canvas.historyRedoAction(() => {
        if ((canvas as any)._forceSync) {
          (canvas as any)._forceSync();
        }
      });
    }
  }, []);

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
    </div>
  );
};

export default UndoRedoToolbar;
