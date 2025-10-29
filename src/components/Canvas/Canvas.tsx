import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Canvas as FabricCanvas } from 'fabric';
import type { Canvas } from 'fabric';
import { setSelectedElement } from '../../store/canvasSlice';
import { colors } from '../../constants/colors';
import './Canvas.css';

// Fabric.js History Implementation
// Extend Canvas with history functionality
declare module 'fabric' {
  namespace fabric {
    interface Canvas {
      historyUndo: any[];
      historyRedo: any[];
      historyNextState: any;
      historyProcessing: boolean;
      historyUndoAction(callback?: any): void;
      historyRedoAction(callback?: any): void;
    }
  }
}

// Debounce function
const debounce = (func: any, wait: number, immediate?: boolean) => {
  let timeout: any;
  return function (this: any, ...args: any[]) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

// Store histories per canvas
const histories: Record<string, any> = {};

// Note: Custom properties (name, id, layerType) are already handled
// via the name property we set in object:added event

(FabricCanvas.prototype as any)._historyNext = function (this: any) {
  const size = {
    height: this.getHeight(),
    width: this.getWidth(),
  };
  return {
    size,
    zoom: 1,
    json: JSON.stringify(this.toDatalessJSON()),
  };
};

(FabricCanvas.prototype as any)._historyEvents = function (this: any) {
  return {
    "object:added": this._historySaveAction,
    "object:removed": this._historySaveAction,
    "object:modified": this._historySaveAction,
  };
};

(FabricCanvas.prototype as any)._historyInit = function (this: any) {
  this.historyUndo = [];
  this.historyRedo = [];
  this.historyNextState = this._historyNext();
  this.historyProcessing = false;

  this.on(this._historyEvents());
};

const store = () => {
  return debounce(
    function (this: any, json: any) {

      // Deduplication: check if this state is different from the last one
      const lastState = this.historyUndo.length > 0
        ? this.historyUndo[this.historyUndo.length - 1]
        : null;

      // Compare JSON strings to detect duplicates
      if (lastState && lastState.json === json.json) {
        this.historyNextState = this._historyNext();
        return;
      }

      this.historyUndo.push(json);
      this.historyNextState = this._historyNext();
    },
    300
  );
};

const createHistory = function (canvas: any) {
  if (!histories[canvas.getElement().id]) {
    histories[canvas.getElement().id] = store.call(canvas);
  }
  return histories[canvas.getElement().id];
};

(FabricCanvas.prototype as any)._historySaveAction = function (this: any, e: any) {
  // Ignore objects without size (guides, etc.)
  if (e && e.target && (!e?.target.height || !e?.target.width)) {
    return;
  }


  // The undo/redo process will trigger object:added/modified events
  // Ignore those events to prevent infinite loops
  if (this.historyProcessing) {
    return;
  }

  const history = createHistory(this);
  const json = this.historyNextState;
  history.call(this, json);
};

(FabricCanvas.prototype as any).historyUndoAction = function (callback?: any) {
  // The undo process will render the new states of the objects
  // Therefore, object:added and object:modified events will triggered again
  // To ignore those events, we are setting a flag.
  this.historyProcessing = true;

  const history = this.historyUndo.pop();

  if (history) {
    // Push the current state to the redo history
    this.historyRedo.push(this._historyNext());
    this.historyNextState = history;
    this._loadHistory(history, "history:undo", callback);
  } else {
    console.log('❌ No history to pop');
    this.historyProcessing = false;
  }
};

(FabricCanvas.prototype as any).historyRedoAction = function (callback?: any) {
  // The undo process will render the new states of the objects
  // Therefore, object:added and object:modified events will triggered again
  // To ignore those events, we are setting a flag.
  this.historyProcessing = true;
  const history = this.historyRedo.pop();
  if (history) {
    // Every redo action is actually a new action to the undo history
    this.historyUndo.push(this._historyNext());
    this.historyNextState = history;
    this._loadHistory(history, "history:redo", callback);
  } else {
    this.historyProcessing = false;
  }
};

(FabricCanvas.prototype as any)._loadHistory = function (history: any, event: any, callback?: any) {
  const canvas = this;
  const { size, zoom, json } = history;

  const { objects, background } = JSON.parse(json);

  // Use loadFromJSON to restore the canvas state
  const historyData = { objects, background };

  // Clear any existing timeout first
  if ((canvas as any)._historyProcessingTimeout) {
    clearTimeout((canvas as any)._historyProcessingTimeout);
  }

  canvas.loadFromJSON(historyData, () => {
    canvas.fire(event);
    canvas.setZoom(zoom);
    canvas.setWidth(size.width * zoom);
    canvas.setHeight(size.height * zoom);
    canvas.requestRenderAll();

    // Delay clearing the flag to allow debounced saves to process
    // The debounce is 300ms, so we wait 400ms to be safe
    const timeout = setTimeout(() => {
      canvas.historyProcessing = false;
      if (callback && typeof callback === "function") callback(history);
    }, 400);

    (canvas as any)._historyProcessingTimeout = timeout;
  });
};

interface CanvasProps {
  addElementCallback?: (canvas: Canvas, type: string) => void;
  wrapperRef?: React.ForwardedRef<HTMLDivElement>;
}

const EditorCanvas = ({ addElementCallback, wrapperRef }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const dispatch = useDispatch();
  const imageLoading = useSelector((state: any) => state.canvas.ui.imageLoading);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = new FabricCanvas(canvasRef.current, {
        width: 1080,
        height: 1080,
        backgroundColor: "white",
      });
      fabricCanvasRef.current = canvas;

      // Configure canvas to include name in serialization
      (canvas as any).includeDefaultValues = false;

      // Customize selection style for cleaner look
      canvas.selectionColor = colors.selectionBackground;
      canvas.selectionBorderColor = colors.selectionBorder;
      canvas.selectionLineWidth = 2;

      // Initialize Fabric.js history system
      (canvas as any)._historyInit();

      // Apply custom controls to all objects and set unique IDs
      // Debounced sender for full canvas JSON to Yjs
      const sendCanvasSnapshot = (() => {
        let t: any = null
        return () => {
          if (t) clearTimeout(t)
          t = setTimeout(() => {
            try {
              if ((window as any)._suppressCounter) return
              const ydoc = (window as any).ydoc
              if (!ydoc) return
              const yShared = ydoc.getMap('shared-canvas')
              const designData = canvas.toJSON()
                ; (designData as any).width = canvas.getWidth()
                ; (designData as any).height = canvas.getHeight()
              const jsonStr = JSON.stringify(designData)
              // Skip writing if identical to last value in the doc
              const currentRemote = yShared.get('json') as string | undefined
              if (currentRemote === jsonStr) return
                // Track our last sent signature locally for echo suppression
                ; (window as any)._lastSentCanvasJson = jsonStr
              const senderId = ydoc.clientID
              const senderTs = Date.now()
              ydoc.transact(() => {
                yShared.set('json', jsonStr)
                yShared.set('updatedAt', senderTs)
                yShared.set('senderId', senderId)
                yShared.set('senderTs', senderTs)
              }, { source: 'canvas-sync', clientId: senderId })
            } catch { }
          }, 250)
        }
      })()

        // Expose a safe, explicit sync trigger for toolbar/panel actions
        ; (canvas as any)._forceSync = () => {
          if ((canvas as any).historyProcessing) return
          sendCanvasSnapshot()
        }

      canvas.on('object:added', (e) => {
        const obj = e.target;
        if (obj) {
          // Mark as being set up to prevent duplicate history saves
          (obj as any).__settingUp = true;

          // Set unique ID if not already set
          const objWithName = obj as any;
          if (!objWithName.name) {
            objWithName.name = `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          // Ensure object has a stable id for CRDT
          if (!(objWithName as any).id) {
            const ydoc = (window as any).ydoc;
            const clientId = ydoc?.clientID || 'local';
            (objWithName as any).id = `${clientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }

          // Add name to stateProperties for serialization
          const existingProps = (obj as any).stateProperties || [];
          if (!existingProps.includes('name')) {
            (obj as any).stateProperties = [...existingProps, 'name'];
          }
          // Also include id in serialized props so toObject/toJSON carries it
          const withNameProps = (obj as any).stateProperties || [];
          if (!withNameProps.includes('id')) {
            (obj as any).stateProperties = [...withNameProps, 'id'];
          }

          obj.set({
            borderColor: colors.selectionBorder,
            cornerColor: colors.selectionBorder,
            cornerSize: 10,
            borderDashArray: [5, 5],
            transparentCorners: false,
          });

          // Ensure text objects are editable and have proper cursor behavior
          if (obj.type === 'textbox') {
            obj.set({
              editable: true,
              cursorDuration: 1000, // Duration of cursor fade-in in milliseconds
              cursorDelay: 500, // Delay between cursor blinks in milliseconds
            });
          }

          // Clear flag after set
          setTimeout(() => {
            (obj as any).__settingUp = false;
            if (!(canvas as any).historyProcessing) {
              sendCanvasSnapshot();
            }
          }, 100);
        }
      });

      // Send on modify/remove actions
      canvas.on('object:modified', (e) => {
        const obj = e?.target as any
        if ((canvas as any).historyProcessing) return
        if (obj?.__settingUp) return
        sendCanvasSnapshot()
      })

      canvas.on('object:removed', (e) => {
        const obj = e?.target as any
        if ((canvas as any).historyProcessing) return
        if (obj?.__settingUp) return
        sendCanvasSnapshot()
      })

      const handleSelection = () => {
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          activeObj.set({
            borderColor: colors.selectionBorder,
            cornerColor: colors.selectionBorder,
            cornerSize: 10,
            borderDashArray: [5, 5],
            transparentCorners: false,
          });

          // Dispatch selected element to Redux with color
          const type = activeObj.type;
          const fill = (activeObj as any).fill;

          // Extract color - handle various Fabric.js color formats
          let color: string = colors.black;
          if (typeof fill === 'string') {
            // Check if it's a valid hex color
            if (/^#[0-9A-Fa-f]{6}$/.test(fill)) {
              color = fill;
            } else if (fill.startsWith('#')) {
              color = fill;
            }
          }

          const objectId = (activeObj as any).name || 'selected';

          dispatch(setSelectedElement({
            type: type as 'textbox' | 'rect' | 'circle' | 'image' | 'triangle' | 'ellipse' | 'polygon' | null,
            objectId: objectId,
            color: color
          }));
        } else {
          dispatch(setSelectedElement(null));
        }
      };

      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);
      canvas.on('selection:cleared', () => {
        dispatch(setSelectedElement(null));
      });

      // Handle double-click for text editing
      canvas.on('mouse:dblclick', (event) => {
        const target = event.target;
        if (target && target.type === 'textbox') {
          // Cast to any to access text-specific methods
          const textTarget = target as any;
          // Enter editing mode
          if (textTarget.enterEditing) {
            textTarget.enterEditing();
          }
          // Ensure the hidden textarea gets focus
          setTimeout(() => {
            if (textTarget.hiddenTextarea) {
              textTarget.hiddenTextarea.focus();
            }
          }, 10);
        }
      });

      // Fabric.js native history is already initialized above
      // It automatically handles object:added, object:removed, and object:modified events

      // Expose canvas instance globally for sidebar access
      (window as any).fabricCanvas = canvas;
      (window as any).canvasReady = true;

      return () => {
        canvas.off('selection:created');
        canvas.off('selection:updated');
        canvas.off('selection:cleared');
        canvas.off('mouse:dblclick');
        canvas.off('object:added');
        canvas.off('object:modified');
        canvas.off('object:removed');
        try { delete (canvas as any)._forceSync } catch { }
        // _historyDispose is called automatically via dispose() override
        canvas.dispose();
      };
    }
  }, [dispatch, addElementCallback]);

  return (
    <div className="canvas-wrapper" ref={wrapperRef}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{ outline: 'none' }}
      />
      {imageLoading && (
        <div className="image-loading-overlay">
          <div className="image-loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="image-loading-text">Uploading image...</p>
        </div>
      )}
    </div>
  );
};

export default EditorCanvas;

