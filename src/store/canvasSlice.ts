import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CanvasElement {
  id: string;
  type: string;
  properties: Record<string, unknown>;
}

interface CanvasState {
  elements: CanvasElement[];
  selectedElementId: string | null;
}

const initialState: CanvasState = {
  elements: [],
  selectedElementId: null,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    addElement: (state, action: PayloadAction<CanvasElement>) => {
      state.elements.push(action.payload);
    },
    updateElement: (state, action: PayloadAction<{ id: string; updates: Partial<CanvasElement> }>) => {
      const element = state.elements.find(el => el.id === action.payload.id);
      if (element) {
        Object.assign(element, action.payload.updates);
      }
    },
    removeElement: (state, action: PayloadAction<string>) => {
      state.elements = state.elements.filter(el => el.id !== action.payload);
    },
    selectElement: (state, action: PayloadAction<string | null>) => {
      state.selectedElementId = action.payload;
    },
  },
});

export const { addElement, updateElement, removeElement, selectElement } = canvasSlice.actions;
export default canvasSlice.reducer;

