import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface SelectedElement {
  type: 'textbox' | 'rect' | 'circle' | 'image' | 'triangle' | 'ellipse' | 'polygon' | null;
  objectId: string | null;
  color?: string;
}

interface CanvasState {
  canvasState: string | null;
  selectedElement: SelectedElement | null;
  history: string[];
  historyIndex: number;
}

const initialState: CanvasState = {
  canvasState: null,
  selectedElement: null,
  history: [],
  historyIndex: -1,
};

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
          console.log('⏭️ Skipping duplicate snapshot');
          return;
        }
      }

      console.log('🔵 saveToHistory called - new snapshot');

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

      console.log('After save:', {
        historyLength: state.history.length,
        historyIndex: state.historyIndex
      });
    },
    undo: (state) => {
      console.log('🟣 undo called');
      console.log('Before undo:', {
        historyLength: state.history.length,
        historyIndex: state.historyIndex,
        canUndo: state.historyIndex > 0
      });

      if (state.historyIndex > 0 && state.history.length > 0) {
        const currentState = state.history[state.historyIndex];
        let targetIndex = state.historyIndex - 1;
        let skippedDuplicates = 0;

        // Skip duplicates and find next unique state
        while (targetIndex >= 0) {
          const prevState = state.history[targetIndex];
          if (prevState === currentState) {
            console.log(`⏭️ Skipping duplicate snapshot at index ${targetIndex}`);
            skippedDuplicates++;
            targetIndex--;
          } else {
            break; // Found unique state
          }
        }

        if (targetIndex >= 0) {
          state.historyIndex = targetIndex;
          state.canvasState = state.history[state.historyIndex];

          console.log('After undo:', {
            historyIndex: state.historyIndex,
            hasState: !!state.history[state.historyIndex],
            skippedDuplicates
          });
        } else {
          console.log('❌ No unique state found - at beginning of history');
        }
      } else {
        console.log('❌ Undo not possible');
      }
    },
    redo: (state) => {
      console.log('🟢 redo called');
      console.log('Before redo:', {
        historyLength: state.history.length,
        historyIndex: state.historyIndex,
        canRedo: state.historyIndex < state.history.length - 1
      });

      if (state.historyIndex < state.history.length - 1 && state.history.length > 0) {
        const currentState = state.history[state.historyIndex];
        let targetIndex = state.historyIndex + 1;
        let skippedDuplicates = 0;

        // Skip duplicates and find next unique state
        while (targetIndex < state.history.length) {
          const nextState = state.history[targetIndex];
          if (nextState === currentState) {
            console.log(`⏭️ Skipping duplicate snapshot at index ${targetIndex}`);
            skippedDuplicates++;
            targetIndex++;
          } else {
            break; // Found unique state
          }
        }

        if (targetIndex < state.history.length) {
          state.historyIndex = targetIndex;
          state.canvasState = state.history[state.historyIndex];

          console.log('After redo:', {
            historyIndex: state.historyIndex,
            hasState: !!state.history[state.historyIndex],
            skippedDuplicates
          });
        } else {
          console.log('❌ No unique state found - at end of history');
        }
      } else {
        console.log('❌ Redo not possible');
      }
    },
    clearHistory: (state) => {
      state.history = [];
      state.historyIndex = -1;
    },
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
  clearHistory
} = canvasSlice.actions;
export default canvasSlice.reducer;

