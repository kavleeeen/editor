import { Canvas, Image, Textbox } from 'fabric';
import { BsTextParagraph, BsImage, BsSquare, BsDownload, BsSave, BsFolder, BsShare } from 'react-icons/bs';
import { shareCanvas, updateCanvas } from '../../services/canvasApi';
import './Sidebar.css';

interface SidebarProps {
  onShapesClick: () => void;
  canvasId: string;
}

const Sidebar = ({ onShapesClick, canvasId }: SidebarProps) => {
  const addText = () => {
    const canvas = (window as any).fabricCanvas as Canvas;
    if (!canvas) return;

    const text = new Textbox('Click to edit', {
      width: 200,
      fontSize: 20,
    });

    // Assign unique ID for CRDT sync
    const ydoc = (window as any).ydoc
    const clientId = ydoc?.clientID || 'unknown'
      ; (text as any).id = `${clientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Center the text on canvas
    const canvasCenterX = canvas.width! / 2;
    const canvasCenterY = canvas.height! / 2;
    text.set({
      left: canvasCenterX - text.width! / 2,
      top: canvasCenterY - text.height! / 2,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const addImage = () => {
    const canvas = (window as any).fabricCanvas as Canvas;
    if (!canvas) return;

    // Create file input for image upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgUrl = event.target?.result as string;
          Image.fromURL(imgUrl)
            .then((img) => {
              // Scale image to fit canvas if it's too large
              const maxWidth = canvas.width! * 0.8;
              const maxHeight = canvas.height! * 0.8;

              let scaleX = 1;
              let scaleY = 1;

              if (img.width! > maxWidth) {
                scaleX = maxWidth / img.width!;
              }
              if (img.height! > maxHeight) {
                scaleY = maxHeight / img.height!;
              }

              const scale = Math.min(scaleX, scaleY);
              img.set({ scaleX: scale, scaleY: scale });

              // Center the image on canvas
              const canvasCenterX = canvas.width! / 2;
              const canvasCenterY = canvas.height! / 2;
              img.set({
                left: canvasCenterX - (img.width! * scale) / 2,
                top: canvasCenterY - (img.height! * scale) / 2,
              });

              // Assign unique ID for CRDT sync
              const ydoc = (window as any).ydoc
              const clientId = ydoc?.clientID || 'unknown'
                ; (img as any).id = `${clientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

              canvas.add(img);
              canvas.setActiveObject(img);

              // Manually trigger history save
              if ((canvas as any)._historySaveAction) {
                (canvas as any)._historySaveAction({ target: null });
              }
            })
            .catch((error) => {
              console.error('Error loading image:', error);
              alert('Failed to load image. Please try another image.');
            });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };


  const exportPNG = () => {
    const canvas = (window as any).fabricCanvas as Canvas;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = 'canvas.png';
    link.href = dataURL;
    link.click();
  };

  const exportJSON = () => {
    const canvas = (window as any).fabricCanvas as Canvas;
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'canvas.json';
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const loadJSON = () => {
    const canvas = (window as any).fabricCanvas as Canvas;
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

  const handleShare = async () => {
    try {
      const userId = '68ffa7c696203598ebc20953'; // Hardcoded user ID
      await shareCanvas(canvasId, userId);
      alert('Canvas shared successfully!');
    } catch (error) {
      console.error('Error sharing canvas:', error);
      alert('Failed to share canvas. Please try again.');
    }
  };

  const handleSave = async () => {
    const canvas = (window as any).fabricCanvas as Canvas;
    if (!canvas) return;

    try {
      const designData: any = canvas.toJSON();
      designData.width = canvas.getWidth();
      designData.height = canvas.getHeight();

      await updateCanvas(canvasId, {
        designData,
        metadata: {
          title: 'My Design'
        }
      });

      alert('Canvas saved successfully');
    } catch (error) {
      console.error('Error saving canvas:', error);
      alert('Failed to save canvas. Please try again.');
    }
  };

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header" />

        <div className="sidebar-section">
          <h3 className="sidebar-title">Elements</h3>
          <button className="sidebar-item" onClick={addText}>
            <BsTextParagraph className="sidebar-icon" />
            <span className="sidebar-label">Text</span>
          </button>
          <button className="sidebar-item" onClick={addImage}>
            <BsImage className="sidebar-icon" />
            <span className="sidebar-label">Image</span>
          </button>
          <button
            className="sidebar-item"
            onClick={onShapesClick}
          >
            <BsSquare className="sidebar-icon" />
            <span className="sidebar-label">Shapes</span>
          </button>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-title">Export</h3>

          <button className="sidebar-item" onClick={exportPNG}>
            <BsDownload className="sidebar-icon" />
            <span className="sidebar-label">Export PNG</span>
          </button>

          <button className="sidebar-item" onClick={handleShare}>
            <BsShare className="sidebar-icon" />
            <span className="sidebar-label">Share Canvas</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

