import { useState, useEffect } from 'react';
import './ColorPanel.css';
import { colors } from '../../constants/colors';
import type { ExtendedCanvas } from '../../types/canvas';
import { isExtendedCanvas } from '../../types/canvas';

interface ColorPanelProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  onBorderColorChange?: (color: string) => void;
}

const ColorPanel = ({ currentColor, onColorChange, onBorderColorChange }: ColorPanelProps) => {
  // Helper functions
  const hexToHsv = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : Math.round((delta / max) * 100);
    const v = Math.round(max * 100);

    return { h, s, v };
  };

  const hsvToHex = (h: number, s: number, v: number) => {
    const c = (v / 100) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = (v / 100) - c;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const [hsv, setHsv] = useState(() => {
    try {
      return hexToHsv(currentColor || colors.black);
    } catch {
      return { h: 0, s: 0, v: 0 };
    }
  });

  // Editable HEX input state
  const [editableHex, setEditableHex] = useState(currentColor || colors.black);

  // Refresh counter to force re-render
  const [refreshKey, setRefreshKey] = useState(0);

  // Border color HSV state
  const [borderHsv, setBorderHsv] = useState(() => {
    try {
      const canvas = (window as any).fabricCanvas as ExtendedCanvas | undefined;
      const activeObj = canvas?.getActiveObject?.();
      const borderColor = activeObj && activeObj.type !== 'textbox' && activeObj.type !== 'image' && activeObj.strokeWidth !== undefined && activeObj.strokeWidth > 0
        ? ((activeObj as { stroke?: string }).stroke || colors.black)
        : colors.black;
      return hexToHsv(borderColor || colors.black);
    } catch {
      return { h: 0, s: 0, v: 0 };
    }
  });

  // Editable border HEX input state
  const [editableBorderHex, setEditableBorderHex] = useState(() => {
    try {
      const canvas = (window as any).fabricCanvas as ExtendedCanvas | undefined;
      const activeObj = canvas?.getActiveObject?.();
      return ((activeObj as { stroke?: string })?.stroke || colors.black);
    } catch {
      return colors.black;
    }
  });

  // Update HSV when currentColor changes from outside
  useEffect(() => {
    if (currentColor && /^#[0-9A-Fa-f]{6}$/.test(currentColor)) {
      try {
        setHsv(hexToHsv(currentColor));
        setEditableHex(currentColor);
      } catch {
        // Ignore invalid colors
      }
    }
  }, [currentColor]);

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newS = Math.max(0, Math.min(100, Math.round(x)));
    const newV = Math.max(0, Math.min(100, Math.round(100 - y)));

    const newHsv = { h: hsv.h, s: newS, v: newV };
    setHsv(newHsv);
    const newColor = hsvToHex(newHsv.h, newS, newV);
    onColorChange(newColor);
  };

  const handleHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * 360;
    const newH = Math.max(0, Math.min(360, Math.round(y)));

    const newHsv = { h: newH, s: hsv.s, v: hsv.v };
    setHsv(newHsv);
    onColorChange(hsvToHex(newH, hsv.s, hsv.v));
  };

  // Border color handlers
  const handleBorderGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newS = Math.max(0, Math.min(100, Math.round(x)));
    const newV = Math.max(0, Math.min(100, Math.round(100 - y)));

    const newHsv = { h: borderHsv.h, s: newS, v: newV };
    setBorderHsv(newHsv);
    const newColor = hsvToHex(newHsv.h, newS, newV);
    if (onBorderColorChange) {
      onBorderColorChange(newColor);
    }
  };

  const handleBorderHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * 360;
    const newH = Math.max(0, Math.min(360, Math.round(y)));

    const newHsv = { h: newH, s: borderHsv.s, v: borderHsv.v };
    setBorderHsv(newHsv);
    const newColor = hsvToHex(newH, borderHsv.s, borderHsv.v);
    if (onBorderColorChange) {
      onBorderColorChange(newColor);
    }
  };

  // Get current color from HSV - ensure it's a valid hex
  const getCurrentHex = () => {
    try {
      // Check if currentColor is a valid hex
      if (currentColor && typeof currentColor === 'string') {
        // Try to match standard hex format
        const hexMatch = currentColor.match(/^#([0-9A-Fa-f]{6})$/);
        if (hexMatch) {
          return `#${hexMatch[1]}`;
        }
      }
      // Fallback to HSV conversion
      return hsvToHex(hsv.h, hsv.s, hsv.v);
    } catch (error) {
      console.error('Error in getCurrentHex:', error);
      return colors.black;
    }
  };

  const currentHex = getCurrentHex();

  // Get RGB values from the current hex
  const getRGB = () => {
    try {
      const hex = currentHex;
      // Ensure hex is valid before parsing
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        return { r: 0, g: 0, b: 0 };
      }
      return {
        r: parseInt(hex.slice(1, 3), 16) || 0,
        g: parseInt(hex.slice(3, 5), 16) || 0,
        b: parseInt(hex.slice(5, 7), 16) || 0
      };
    } catch (error) {
      console.error('Error in getRGB:', error);
      return { r: 0, g: 0, b: 0 };
    }
  };

  const rgb = getRGB();

  // Check if current element is a shape with border
  const canvas = (window as any).fabricCanvas as ExtendedCanvas | undefined;

  // Force re-read of active object on every render
  const activeObj = canvas?.getActiveObject?.();
  const isShape = activeObj && activeObj.type !== 'textbox' && activeObj.type !== 'image';
  const hasBorder = activeObj && (activeObj as any).strokeWidth !== undefined && (activeObj as any).strokeWidth > 0;
  const hasFill = activeObj && (activeObj as any).fill && (activeObj as any).fill !== 'transparent';

  // Get actual fill color from object
  const actualFillColor = (activeObj as any)?.fill || currentColor || colors.black;

  // Update HSV when fill color changes (e.g., when fill is toggled on/off)
  useEffect(() => {
    if (hasFill && actualFillColor) {
      try {
        const fillHex = typeof actualFillColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(actualFillColor)
          ? actualFillColor
          : currentColor || colors.black;
        setHsv(hexToHsv(fillHex));
        setEditableHex(fillHex);
      } catch (error) {
        console.error('Error updating fill HSV:', error);
      }
    }
  }, [hasFill, actualFillColor, currentColor]);

  // Get actual border color from object
  const actualBorderColor = hasBorder ? ((activeObj as any)?.stroke || colors.black) : colors.black;

  // Update border HSV when border color changes
  useEffect(() => {
    if (hasBorder && actualBorderColor) {
      try {
        const borderHex = typeof actualBorderColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(actualBorderColor)
          ? actualBorderColor
          : colors.black;
        setBorderHsv(hexToHsv(borderHex));
        setEditableBorderHex(borderHex);
      } catch (error) {
        console.error('Error updating border HSV:', error);
      }
    }
  }, [hasBorder, actualBorderColor]);

  // Add listener to canvas object:modified event to force re-render
  useEffect(() => {
    if (!canvas || !isExtendedCanvas(canvas)) return;

    const handleObjectModified = () => {
      // Small delay to ensure object properties are updated
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 0);
    };

    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:added', handleObjectModified);
    canvas.on('selection:updated', handleObjectModified);
    canvas.on('selection:created', handleObjectModified);
    canvas.on('selection:cleared', handleObjectModified);

    // Also listen to property changes
    const intervalId = setInterval(() => {
      if (canvas) {
        setRefreshKey(prev => prev + 1);
      }
    }, 100); // Poll every 100ms to catch rapid changes

    return () => {
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:added', handleObjectModified);
      canvas.off('selection:updated', handleObjectModified);
      canvas.off('selection:created', handleObjectModified);
      canvas.off('selection:cleared', handleObjectModified);
      clearInterval(intervalId);
    };
  }, [canvas]);

  return (
    <div className="color-panel" key={refreshKey}>
      {/* Fill Color Section - Only show if fill is not transparent */}
      {hasFill && (
        <>
          <h4 style={{
            margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600,
            color: colors.textDark
          }}>Fill Color</h4>

          <div className="color-picker-container">
            {/* Main Saturation/Value Grid */}
            <div
              className="color-grid"
              style={{
                background: `linear-gradient(to bottom, 
              hsl(${hsv.h}, 100%, 50%), 
              hsl(${hsv.h}, 100%, 0%)
            ), linear-gradient(to right, 
              transparent, 
              hsl(${hsv.h}, 0%, 50%)
            )`
              }}
              onClick={handleGridClick}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleGridClick(e);
              }}
            >
              <div
                className="color-pointer"
                style={{
                  left: `${hsv.s}%`,
                  top: `${100 - hsv.v}%`
                }}
              />
            </div>

            {/* Hue Slider */}
            <div
              className="hue-slider"
              onClick={handleHueClick}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleHueClick(e);
              }}
            >
              <div
                className="hue-pointer"
                style={{ top: `${hsv.h / 360 * 100}%` }}
              />
            </div>
          </div>

          {/* Current Color Preview */}
          <div
            className="current-color-preview"
            style={{ backgroundColor: currentHex }}
          />

          {/* Color Values */}
          <div className="color-values">
            <div className="color-value-group">
              <label>HEX</label>
              <input
                type="text"
                value={editableHex}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow typing hex characters
                  if (/^#[0-9A-Fa-f]{0,6}$/i.test(value)) {
                    setEditableHex(value);

                    // Validate and update when complete
                    if (/^#[0-9A-Fa-f]{6}$/i.test(value)) {
                      onColorChange(value);
                      try {
                        setHsv(hexToHsv(value));
                      } catch (error) {
                        console.error('Error converting hex to HSV:', error);
                      }
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  // On blur, validate and fix if incomplete
                  if (/^#[0-9A-Fa-f]{1,5}$/i.test(value)) {
                    // Invalid hex, restore to currentHex
                    setEditableHex(currentHex);
                  }
                }}
                className="color-input"
              />
            </div>

            <div className="color-value-row">
              <div className="color-value-group">
                <label>R</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => {
                    const r = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                    const newColor = `#${[r, rgb.g, rgb.b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                    onColorChange(newColor);
                    setHsv(hexToHsv(newColor));
                  }}
                  className="color-input rgb-input"
                />
              </div>

              <div className="color-value-group">
                <label>G</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => {
                    const g = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                    const newColor = `#${[rgb.r, g, rgb.b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                    onColorChange(newColor);
                    setHsv(hexToHsv(newColor));
                  }}
                  className="color-input rgb-input"
                />
              </div>

              <div className="color-value-group">
                <label>B</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => {
                    const b = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                    const newColor = `#${[rgb.r, rgb.g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                    onColorChange(newColor);
                    setHsv(hexToHsv(newColor));
                  }}
                  className="color-input rgb-input"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Border Color Section - Only show for shapes with border */}
      {isShape && hasBorder && onBorderColorChange && (() => {
        const borderColor = ((activeObj as { stroke?: string }).stroke || colors.black) as string;
        const borderRgb = /^#[0-9A-Fa-f]{6}$/.test(borderColor)
          ? {
            r: parseInt(borderColor.slice(1, 3), 16) || 0,
            g: parseInt(borderColor.slice(3, 5), 16) || 0,
            b: parseInt(borderColor.slice(5, 7), 16) || 0
          }
          : { r: 0, g: 0, b: 0 };

        return (
          <>
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.borderSidebar}` }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 600, color: colors.textDark }}>Border Color</h4>

              {/* Border Color Picker */}
              <div className="color-picker-container" style={{ marginBottom: '15px' }}>
                {/* Main Saturation/Value Grid */}
                <div
                  className="color-grid"
                  style={{
                    background: `linear-gradient(to bottom, 
                      hsl(${borderHsv.h}, 100%, 50%), 
                      hsl(${borderHsv.h}, 100%, 0%)
                    ), linear-gradient(to right, 
                      transparent, 
                      hsl(${borderHsv.h}, 0%, 50%)
                    )`
                  }}
                  onClick={handleBorderGridClick}
                  onMouseMove={(e) => {
                    if (e.buttons === 1) handleBorderGridClick(e);
                  }}
                >
                  <div
                    className="color-pointer"
                    style={{
                      left: `${borderHsv.s}%`,
                      top: `${100 - borderHsv.v}%`
                    }}
                  />
                </div>

                {/* Hue Slider */}
                <div
                  className="hue-slider"
                  onClick={handleBorderHueClick}
                  onMouseMove={(e) => {
                    if (e.buttons === 1) handleBorderHueClick(e);
                  }}
                >
                  <div
                    className="hue-pointer"
                    style={{ top: `${borderHsv.h / 360 * 100}%` }}
                  />
                </div>
              </div>

              {/* Border Color Preview */}
              <div
                className="current-color-preview"
                style={{ backgroundColor: borderColor, marginBottom: '15px' }}
              />

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', color: colors.textMedium, display: 'block', marginBottom: '5px' }}>HEX</label>
                <input
                  type="text"
                  value={editableBorderHex}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow typing hex characters
                    if (/^#[0-9A-Fa-f]{0,6}$/i.test(value)) {
                      setEditableBorderHex(value);

                      // Validate and update when complete
                      if (/^#[0-9A-Fa-f]{6}$/i.test(value)) {
                        (activeObj as { stroke?: string }).stroke = value;
                        canvas?.renderAll?.();
                        onBorderColorChange(value);
                        try {
                          setBorderHsv(hexToHsv(value));
                        } catch (error) {
                          console.error('Error updating border HSV:', error);
                        }
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    // On blur, validate and fix if incomplete
                    if (/^#[0-9A-Fa-f]{1,5}$/i.test(value)) {
                      // Invalid hex, restore to borderColor
                      setEditableBorderHex(borderColor);
                    }
                  }}
                  className="color-input"
                />
              </div>

              <div className="color-value-row">
                <div className="color-value-group">
                  <label>R</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={borderRgb.r}
                    onChange={(e) => {
                      const r = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                      const newColor = `#${[r, borderRgb.g, borderRgb.b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                      (activeObj as { stroke?: string }).stroke = newColor;
                      canvas?.renderAll?.();
                      onBorderColorChange(newColor);
                      try {
                        setBorderHsv(hexToHsv(newColor));
                      } catch (error) {
                        console.error('Error updating border HSV:', error);
                      }
                    }}
                    className="color-input rgb-input"
                  />
                </div>

                <div className="color-value-group">
                  <label>G</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={borderRgb.g}
                    onChange={(e) => {
                      const g = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                      const newColor = `#${[borderRgb.r, g, borderRgb.b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                      (activeObj as { stroke?: string }).stroke = newColor;
                      canvas?.renderAll?.();
                      onBorderColorChange(newColor);
                      try {
                        setBorderHsv(hexToHsv(newColor));
                      } catch (error) {
                        console.error('Error updating border HSV:', error);
                      }
                    }}
                    className="color-input rgb-input"
                  />
                </div>

                <div className="color-value-group">
                  <label>B</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={borderRgb.b}
                    onChange={(e) => {
                      const b = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                      const newColor = `#${[borderRgb.r, borderRgb.g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
                      (activeObj as { stroke?: string }).stroke = newColor;
                      canvas?.renderAll?.();
                      onBorderColorChange(newColor);
                      try {
                        setBorderHsv(hexToHsv(newColor));
                      } catch (error) {
                        console.error('Error updating border HSV:', error);
                      }
                    }}
                    className="color-input rgb-input"
                  />
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default ColorPanel;
