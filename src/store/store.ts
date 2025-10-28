import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['canvas/saveToHistory'],
        ignoredPaths: ['canvas.history'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
