import { useState, useEffect, useRef } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'
import Canvas from './components/Canvas/Canvas'
import Sidebar from './components/Sidebar/Sidebar'
import ElementToolbar from './components/ElementToolbar/ElementToolbar'
import Panel from './components/Panel/Panel'
import FontPanel from './components/FontPanel/FontPanel'
import ColorPanel from './components/ColorPanel/ColorPanel'
import ShapesPanel from './components/ShapesPanel/ShapesPanel'
import LayersPanel from './components/LayersPanel/LayersPanel'
import UndoRedoToolbar from './components/UndoRedoToolbar/UndoRedoToolbar'
import Loader from './components/Loader/Loader'
import { updateSelectedElementColor } from './store/canvasSlice'
import { loadCanvas } from './services/canvasApi'
import type { RootState } from './store/store'
import { colors } from './constants/colors'
import './App.css'

type PanelType = 'font' | 'color' | 'shapes' | null

function App() {
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true)
  const selectedElement = useSelector((state: RootState) => state.canvas.selectedElement)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  const { id } = useParams<{ id: string }>()

  // Redirect to dashboard if no ID (this should not happen with proper routing)
  if (!id) {
    return <Navigate to="/" replace />
  }

  const handleFontClick = () => setActivePanel('font')
  const handleColorClick = () => setActivePanel('color')
  const handleShapesClick = () => setActivePanel('shapes')
  const closePanel = () => setActivePanel(null)

  // Auto-close font/color panels when no element is selected (but keep shapes open)
  useEffect(() => {
    if (!selectedElement && activePanel !== null && activePanel !== 'shapes') {
      setActivePanel(null)
    }
  }, [selectedElement, activePanel])

  // Load canvas from API on mount
  useEffect(() => {
    const loadCanvasDesign = async () => {
      if (!id) return;

      setIsLoadingCanvas(true);

      try {
        const result = await loadCanvas(id);

        if (result.success && result.data?.designData) {
          // Wait for canvas to be initialized
          const waitForCanvas = () => {
            const canvas = (window as any).fabricCanvas;
            const canvasReady = (window as any).canvasReady;

            if (canvas && canvasReady) {
              console.log('📥 Loading canvas design...');

              // Load the design data into the canvas
              canvas.loadFromJSON(result.data.designData, () => {
                console.log('📦 Canvas data loaded, rendering...');

                // Force immediate render
                canvas.renderAll();

                // Additional render after a brief delay to ensure everything is visible
                setTimeout(() => {
                  canvas.renderAll();
                  canvas.requestRenderAll();

                  // Force DOM update
                  const canvasEl = canvas.getElement();
                  if (canvasEl) {
                    canvasEl.dispatchEvent(new Event('resize'));
                  }

                  console.log('✅ Canvas loaded and rendered successfully');
                  setIsLoadingCanvas(false);
                }, 200);
              }, (fabricObjects: any, error: any) => {
                if (error) {
                  console.error('❌ Error loading canvas objects:', error);
                } else {
                  console.log('📦 Objects loaded:', fabricObjects?.length);
                }
              });
            } else {
              // Retry if canvas not ready yet
              console.log('⏳ Waiting for canvas to be ready...');
              setTimeout(waitForCanvas, 50);
            }
          };

          waitForCanvas();
        } else {
          setIsLoadingCanvas(false);
        }
      } catch (error: any) {
        if (error.message && error.message.includes('404')) {
          console.log('ℹ️ No saved canvas found, starting fresh');
        } else {
          console.error('❌ Error loading canvas:', error);
        }
        setIsLoadingCanvas(false);
      }
    };

    // Wait a bit for canvas to be initialized before trying to load
    const timeout = setTimeout(() => {
      loadCanvasDesign();
    }, 100);

    return () => clearTimeout(timeout);
  }, [id]);

  // Auto-scale canvas to fit viewport
  useEffect(() => {
    const updateCanvasScale = () => {
      const wrapper = canvasWrapperRef.current
      if (!wrapper) return

      const viewport = wrapper.parentElement
      if (!viewport) return

      const viewportWidth = viewport.clientWidth
      const viewportHeight = viewport.clientHeight
      const canvasWidth = 1080
      const canvasHeight = 1080

      // Calculate scale to fit both width and height with padding
      const padding = 20
      const scaleX = (viewportWidth - padding * 2) / canvasWidth
      const scaleY = (viewportHeight - padding * 2) / canvasHeight
      const scale = Math.min(scaleX, scaleY) // Allow scaling down, never scale up beyond viewport size

      wrapper.style.transform = `scale(${scale})`
    }

    updateCanvasScale()
    window.addEventListener('resize', updateCanvasScale)

    return () => {
      window.removeEventListener('resize', updateCanvasScale)
    }
  }, [])


  return (
    <div className="app">

      {/* Loading overlay */}
      {isLoadingCanvas && <Loader title="Loading Canvas" text="Preparing your editor..." />}

      <Sidebar onShapesClick={handleShapesClick} />
      <div className="main-content">
        <ElementToolbar onFontClick={handleFontClick} onColorClick={handleColorClick} />
      </div>

      <div className={`canvas-viewport ${activePanel ? 'with-panel' : ''}`}>
        <Canvas wrapperRef={canvasWrapperRef} />
      </div>
      <UndoRedoToolbar canvas={(window as any).fabricCanvas as any} />

      {activePanel === 'font' && (
        <Panel title="Font" onClose={closePanel}>
          <FontPanel onSelectFont={(fontFamily) => {
            const canvas = (window as any).fabricCanvas;
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.type === 'textbox') {
              // Apply font change
              activeObj.set('fontFamily', fontFamily);
              canvas.requestRenderAll();

              // Manually trigger history save for toolbar actions
              if (canvas._historySaveAction) {
                canvas._historySaveAction({ target: activeObj });
              }
            }
            // Don't close panel automatically - let user close it manually
          }} />
        </Panel>
      )}

      {activePanel === 'color' && (
        <Panel title="Color" onClose={closePanel}>
          <ColorPanel
            currentColor={selectedElement?.color || colors.black}
            onColorChange={(color) => {
              const canvas = (window as any).fabricCanvas;
              if (!canvas) return;
              const activeObj = canvas.getActiveObject();
              if (activeObj) {
                // Apply color change
                activeObj.set('fill', color);
                canvas.requestRenderAll();
                dispatch(updateSelectedElementColor(color));

                // Manually trigger history save for toolbar actions
                if (canvas._historySaveAction) {
                  canvas._historySaveAction({ target: activeObj });
                }
              }
            }}
            onBorderColorChange={(color: string) => {
              const canvas = (window as any).fabricCanvas;
              if (!canvas) return;
              const activeObj = canvas.getActiveObject();
              if (activeObj) {
                // Apply border color change
                activeObj.set('stroke', color);
                canvas.requestRenderAll();

                // Manually trigger history save for toolbar actions
                if (canvas._historySaveAction) {
                  canvas._historySaveAction({ target: activeObj });
                }
              }
            }}
          />
        </Panel>
      )}

      {activePanel === 'shapes' && (
        <ShapesPanel onClose={closePanel} />
      )}

      <LayersPanel />
    </div>
  )
}

export default App
