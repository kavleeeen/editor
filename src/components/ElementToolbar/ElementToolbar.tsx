import { useSelector } from 'react-redux';
import { BsPalette } from 'react-icons/bs';
import { RxBorderAll } from 'react-icons/rx';
import { Tooltip } from '@mui/material';
import type { FabricObject } from 'fabric';
import './ElementToolbar.css';
import { selectSelectedElement } from '../../store/selectors';
import { colors } from '../../constants/colors';
import type { ExtendedCanvas } from '../../types/canvas';

interface ElementToolbarProps {
  onFontClick: () => void;
  onColorClick: () => void;
}

const ElementToolbar = ({ onFontClick, onColorClick }: ElementToolbarProps) => {
  const selectedElement = useSelector(selectSelectedElement);

  if (!selectedElement) {
    return null;
  }

  const canvas = (window as any).fabricCanvas as ExtendedCanvas;
  if (!canvas) return null;

  const activeObj = canvas.getActiveObject() as FabricObject;
  if (!activeObj) return null;

  const obj = activeObj;
  const isText = selectedElement.type === 'textbox';
  const isImage = selectedElement.type === 'image';

  const handleFontSizeChange = (delta: number) => {
    if (isText && obj.type === 'textbox') {
      const currentSize = (obj as any).fontSize || 20;
      const newSize = Math.max(8, Math.min(144, currentSize + delta));
      obj.set('fontSize', newSize);
      canvas.renderAll();

      // Manually trigger history save
      if (canvas._historySaveAction) {
        canvas._historySaveAction({ target: obj });
      }
      // Trigger collaborative sync
      if ((canvas as any)._forceSync) {
        (canvas as any)._forceSync()
      }
    }
  };


  const toggleBold = () => {
    if (isText && obj.type === 'textbox') {
      const currentWeight = (obj as any).fontWeight;
      obj.set('fontWeight', currentWeight === 'bold' ? 'normal' : 'bold');
      canvas.renderAll();

      // Manually trigger history save
      if (canvas._historySaveAction) {
        canvas._historySaveAction({ target: obj });
      }
      // Trigger collaborative sync
      if ((canvas as any)._forceSync) {
        (canvas as any)._forceSync()
      }
    }
  };

  const toggleItalic = () => {
    if (isText && obj.type === 'textbox') {
      const currentStyle = (obj as any).fontStyle;
      obj.set('fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
      canvas.renderAll();

      // Manually trigger history save
      if (canvas._historySaveAction) {
        canvas._historySaveAction({ target: obj });
      }
      // Trigger collaborative sync
      if ((canvas as any)._forceSync) {
        (canvas as any)._forceSync()
      }
    }
  };

  const toggleBorder = () => {
    if (!isText && !isImage) {
      const currentStrokeWidth = (obj as any).strokeWidth || 0;
      const currentFill = (obj as any).fill;

      // If removing border and fill is transparent, enable fill first
      if (currentStrokeWidth > 0 && currentFill === 'transparent') {
        obj.set('fill', colors.shapeFill); // Enable fill
        obj.set('strokeWidth', 0); // Then remove border
      } else {
        const newStrokeWidth = currentStrokeWidth > 0 ? 0 : 2;
        obj.set('strokeWidth', newStrokeWidth);

        // If turning border ON and fill is transparent, also enable fill
        if (newStrokeWidth > 0 && currentFill === 'transparent') {
          obj.set('fill', colors.shapeFill);
        }
      }

      canvas.renderAll();

      // Manually trigger history save
      if (canvas._historySaveAction) {
        canvas._historySaveAction({ target: obj });
      }
      // Trigger collaborative sync
      if ((canvas as any)._forceSync) {
        (canvas as any)._forceSync()
      }
    }
  };

  const toggleFill = () => {
    if (!isText && !isImage) {
      const currentFill = (obj as any).fill;
      const currentStrokeWidth = (obj as any).strokeWidth || 0;

      // If removing fill and border is off, enable border first
      if (currentFill !== 'transparent' && currentStrokeWidth === 0) {
        obj.set('strokeWidth', 2); // Enable border
        obj.set('fill', 'transparent'); // Then remove fill
      } else {
        const newFill = currentFill === 'transparent' ? colors.shapeFill : 'transparent';
        obj.set('fill', newFill);

        // If turning fill ON and border is off, also enable border
        if (newFill !== 'transparent' && currentStrokeWidth === 0) {
          obj.set('strokeWidth', 2);
        }
      }

      canvas.renderAll();

      // Manually trigger history save
      if (canvas._historySaveAction) {
        canvas._historySaveAction({ target: obj });
      }
      // Trigger collaborative sync
      if ((canvas as any)._forceSync) {
        (canvas as any)._forceSync()
      }
    }
  };

  const currentFontSize = isText && obj.type === 'textbox' ? ((obj as any).fontSize || 20) : null;
  const currentFill = (obj as any).fill || colors.black;

  const currentFontFamily = isText && obj.type === 'textbox' ? ((obj as any).fontFamily || 'Arial') : 'Arial';

  return (
    <div className="element-toolbar">
      {/* Font Button - always show but disabled for non-text */}
      <div className="toolbar-group">
        <Tooltip title="Font Family" arrow placement="bottom">
          <button
            className="toolbar-btn"
            onClick={onFontClick}
            disabled={!isText}
          >
            <span style={{ fontFamily: currentFontFamily }}>Aa</span>
          </button>
        </Tooltip>
      </div>

      {/* Font Size - always show but disabled for non-text */}
      <div className="toolbar-group">
        <Tooltip title="Decrease Font Size" arrow placement="bottom">
          <button
            className="toolbar-btn icon"
            onClick={() => handleFontSizeChange(-2)}
            disabled={!isText}
          >
            −
          </button>
        </Tooltip>
        <Tooltip title="Font Size" arrow placement="bottom">
          <input
            type="number"
            className="font-size-input"
            value={currentFontSize || ''}
            onChange={(e) => {
              if (isText) {
                const size = parseInt(e.target.value) || 20;
                obj.set('fontSize', size);
                canvas.renderAll();

                // Manually trigger history save
                if (canvas._historySaveAction) {
                  canvas._historySaveAction({ target: obj });
                }
                // Trigger collaborative sync
                if ((canvas as any)._forceSync) {
                  (canvas as any)._forceSync()
                }
              }
            }}
            min="8"
            max="144"
            disabled={!isText}
          />
        </Tooltip>
        <Tooltip title="Increase Font Size" arrow placement="bottom">
          <button
            className="toolbar-btn icon"
            onClick={() => handleFontSizeChange(2)}
            disabled={!isText}
          >
            +
          </button>
        </Tooltip>
      </div>

      {/* Color Button - always enabled */}
      <div className="toolbar-group">
        <Tooltip title="Fill Color" arrow placement="bottom">
          <button
            className="toolbar-btn color-picker-btn"
            onClick={onColorClick}
            style={{
              backgroundColor: typeof currentFill === 'string' && currentFill.startsWith('#') ? currentFill : colors.black
            }}
          >
          </button>
        </Tooltip>
      </div>

      {/* Bold - always show but disabled for non-text */}
      <div className="toolbar-group">
        <Tooltip title="Bold Text" arrow placement="bottom">
          <button
            className={`toolbar-btn ${isText && (obj as any).fontWeight === 'bold' ? 'active' : ''}`}
            onClick={toggleBold}
            disabled={!isText}
          >
            <strong>B</strong>
          </button>
        </Tooltip>
      </div>

      {/* Italic - always show but disabled for non-text */}
      <div className="toolbar-group">
        <Tooltip title="Italic Text" arrow placement="bottom">
          <button
            className={`toolbar-btn ${isText && (obj as any).fontStyle === 'italic' ? 'active' : ''}`}
            onClick={toggleItalic}
            disabled={!isText}
          >
            <em>I</em>
          </button>
        </Tooltip>
      </div>

      {/* Border Toggle - disabled when fill is off or when trying to turn off would make both off */}
      <div className="toolbar-group">
        <Tooltip title="Toggle Border" arrow placement="bottom">
          <button
            className={`toolbar-btn ${!isText && !isImage && (obj as any).strokeWidth > 0 ? 'active-muted' : ''}`}
            onClick={toggleBorder}
            disabled={isText || isImage || (obj as any).fill === 'transparent'}
          >
            <RxBorderAll />
          </button>
        </Tooltip>
      </div>

      {/* Fill Toggle - disabled when border is off or when trying to turn off would make both off */}
      <div className="toolbar-group">
        <Tooltip title="Toggle Fill" arrow placement="bottom">
          <button
            className={`toolbar-btn ${!isText && !isImage && (obj as any).fill !== 'transparent' ? 'active-muted' : ''}`}
            onClick={toggleFill}
            disabled={isText || isImage || ((obj as any).strokeWidth || 0) === 0}
          >
            <BsPalette />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default ElementToolbar;

