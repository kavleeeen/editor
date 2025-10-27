import { useEffect, useRef } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import type { Canvas } from 'fabric';
import './Canvas.css';

const EditorCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = new FabricCanvas(canvasRef.current, {
        width: 1080,
        height: 1080,
      });
      fabricCanvasRef.current = canvas;

      return () => {
        canvas.dispose();
      };
    }
  }, []);

  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default EditorCanvas;

