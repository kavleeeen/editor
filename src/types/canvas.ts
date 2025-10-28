import { Canvas as FabricCanvas } from 'fabric';

// Extended Canvas interface with custom properties and methods
export interface ExtendedCanvas extends FabricCanvas {
  _historySaveAction?: (event: { target: any }) => void;
  _forceSync?: () => void;
}

// Type guard to check if canvas has extended properties
export const isExtendedCanvas = (canvas: any): canvas is ExtendedCanvas => {
  return canvas && typeof canvas === 'object' && 'getActiveObject' in canvas;
};
