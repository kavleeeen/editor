import { Image, Textbox } from 'fabric';
import { useNavigate } from 'react-router-dom';
import { BsTextParagraph, BsImage, BsSquare, BsDownload, BsHouse } from 'react-icons/bs';
import './Sidebar.css';
import type { ExtendedCanvas } from '../types/canvas';

interface SidebarProps {
  onShapesClick: () => void;
  canvasTitle?: string;
}

const Sidebar = ({ onShapesClick, canvasTitle }: SidebarProps) => {
  const navigate = useNavigate();
  const addText = () => {
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    const text = new Textbox('Click to edit', {
      width: 200,
      fontSize: 20,
      editable: true, // Ensure text is editable
      cursorDuration: 1000, // Duration of cursor fade-in in milliseconds
      cursorDelay: 500, // Delay between cursor blinks in milliseconds
    });
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
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
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

              canvas.add(img);
              canvas.setActiveObject(img);

              // Manually trigger history save
              if (canvas._historySaveAction) {
                canvas._historySaveAction({ target: null });
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
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    
    // Use canvas title as filename, sanitize it for file system compatibility
    const title = canvasTitle || 'Untitled';
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
    link.download = `${sanitizedTitle}.png`;
    
    link.href = dataURL;
    link.click();
  };

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="sidebar-home-btn" onClick={() => navigate('/')} title="Home">
            <BsHouse className="sidebar-icon" />
          </button>
        </div>

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

        </div>
      </div>
    </>
  );
};

export default Sidebar;

