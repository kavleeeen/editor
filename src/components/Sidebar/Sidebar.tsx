import { Image, Textbox } from 'fabric';
import { BsTextParagraph, BsImage, BsSquare, BsDownload, BsShare } from 'react-icons/bs';
import { useDispatch } from 'react-redux';
import { openShareModal, setImageLoading } from '../../store/canvasSlice';
import { uploadFile } from '../../services/uploadApi';
import './Sidebar.css';
import type { ExtendedCanvas } from '../../types/canvas';

interface SidebarProps {
  onShapesClick: () => void;
  canvasId: string;
  canvasTitle?: string;
}

const Sidebar = ({ onShapesClick, canvasTitle }: SidebarProps) => {
  const dispatch = useDispatch();
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
    const canvas = (window as any).fabricCanvas as ExtendedCanvas;
    if (!canvas) return;

    // Create file input for image upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Set loading state to true
          dispatch(setImageLoading(true));

          // Upload the file to the server
          const uploadResult = await uploadFile(file);

          if (!uploadResult.success || !uploadResult.url) {
            throw new Error(uploadResult.message || 'Upload failed');
          }

          // Use the uploaded image URL instead of data URL
          Image.fromURL(uploadResult.url, {
            crossOrigin: 'anonymous'
          })
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

              // Set loading state to false
              dispatch(setImageLoading(false));
            })
            .catch((error) => {
              alert('Failed to load image. Please try another image.');
              // Set loading state to false on error
              dispatch(setImageLoading(false));
            });
        } catch (error) {
          alert('Failed to upload image. Please try again.');
          // Set loading state to false on error
          dispatch(setImageLoading(false));
        }
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

  const handleShare = () => {
    dispatch(openShareModal());
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

