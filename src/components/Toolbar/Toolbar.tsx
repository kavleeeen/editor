import { Image, Textbox, Rect, Circle } from 'fabric';
import './Toolbar.css';
import type { ExtendedCanvas } from '../../types/canvas';

const Toolbar = () => {

  const loadJSON = () => {
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            canvas.loadFromJSON(json, () => {
              canvas.renderAll();

              // Manually trigger history save after loading
              if (canvas._historySaveAction) {
                canvas._historySaveAction({ target: null });
              }
            });
          } catch (error) {
            console.error('Error loading JSON:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  const addText = () => {
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    const text = new Textbox('Click to edit', {
      left: 100,
      top: 100,
      width: 200,
      fontSize: 20,
      editable: true, // Ensure text is editable
      cursorDuration: 1000, // Duration of cursor fade-in in milliseconds
      cursorDelay: 500, // Delay between cursor blinks in milliseconds
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const addImage = () => {
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    // Using a placeholder image URL
    const imgUrl = 'https://via.placeholder.com/300x200';
    Image.fromURL(imgUrl, {
      crossOrigin: 'anonymous'
    }).then((img: Image) => {
      img.set({ left: 100, top: 100, scaleX: 0.5, scaleY: 0.5 });
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };

  const addRectangle = () => {
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 200,
      fill: 'lightblue',
      stroke: 'black',
      strokeWidth: 2,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  };

  const addCircle = () => {
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 100,
      fill: 'lightcoral',
      stroke: 'black',
      strokeWidth: 2,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  };

  const exportPNG = () => {
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    // Export as PNG with high quality
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2 // 2x for higher resolution
    });

    // Create download link
    const link = document.createElement('a');
    link.download = 'canvas-export.png';
    link.href = dataURL;
    link.click();
  };

  const exportJSON = () => {
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'canvas.json';
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="toolbar">
      <button onClick={addText} className="toolbar-btn">Add Text</button>
      <button onClick={addImage} className="toolbar-btn">Add Image</button>
      <button onClick={addRectangle} className="toolbar-btn">Add Rectangle</button>
      <button onClick={addCircle} className="toolbar-btn">Add Circle</button>
      <div className="toolbar-separator" />
      <button onClick={loadJSON} className="toolbar-btn load">Load JSON</button>
      <button onClick={exportPNG} className="toolbar-btn export">Export PNG</button>
      <button onClick={exportJSON} className="toolbar-btn export">Export JSON</button>
    </div>
  );
};

export default Toolbar;

