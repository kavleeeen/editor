import { useState, useEffect, useRef } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
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
import { loadCanvas, updateCanvas } from './services/canvasApi'
import type { RootState } from './store/store'
import { colors } from './constants/colors'
import './Editor.css'
import { getUserFromToken } from './services/authApi'

type PanelType = 'font' | 'color' | 'shapes' | null

function Editor() {
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [connectedPeers, setConnectedPeers] = useState<{ id: string; name: string; initials: string }[]>([])
  const selectedElement = useSelector((state: RootState) => state.canvas.selectedElement)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const lastSavedDataRef = useRef<string>('')
  const dispatch = useDispatch()
  const { id } = useParams<{ id: string }>()

  // Redirect to dashboard if no ID (this should not happen with proper routing)
  if (!id) {
    return <Navigate to="/dashboard" replace />
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

  // Helper to compute initials from a name/email
  const computeInitials = (name?: string, email?: string) => {
    const n = (name || '').trim()
    if (n) {
      const parts = n.split(/\s+/).filter(Boolean)
      const first = parts[0]?.[0] || ''
      const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
      return (first + last).toUpperCase() || first.toUpperCase()
    }
    const e = (email || '').trim()
    if (e) return e[0]?.toUpperCase() || ''
    return ''
  }

  // Soft colors for peer avatars
  const softColors = [
    '#FFB3BA', // Light pink
    '#BAFFC9', // Light green
    '#BAE1FF', // Light blue
    '#FFFFBA', // Light yellow
    '#FFDFBA'  // Light orange
  ]

  // Get random color for peer based on their ID
  const getPeerColor = (peerId: string) => {
    if (!peerId) return softColors[0]
    let hash = 0
    for (let i = 0;i < peerId.length;i++) {
      hash = peerId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return softColors[Math.abs(hash) % softColors.length]
  }

  // Yjs collaboration setup for canvas JSON + presence (awareness)
  useEffect(() => {
    if (!id) return

    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider('ws://localhost:3001', id, ydoc)

    provider.on('status', (event: any) => {
      setConnectionStatus(event.status)
    })

    // Presence: publish our user info once, and listen for others
    const awareness = provider.awareness
    const me = getUserFromToken()
    const myInits = computeInitials(me?.name, me?.email)
    awareness.setLocalStateField('user', {
      id: me?.id || '',
      name: me?.name || '',
      email: me?.email || '',
      initials: myInits
    })

    const handleAwarenessChange = () => {
      try {
        const statesMap: Map<number, any> = awareness.getStates()
        const selfClientId = (ydoc as any).clientID as number
        const peers = Array.from(statesMap.entries())
          .filter(([clientId]) => clientId !== selfClientId)
          .map(([, state]) => {
            const u = state?.user || {}
            return {
              id: u.id || '',
              name: u.name || 'Guest',
              initials: (u.initials || computeInitials(u.name, u.email) || '??') as string
            }
          })
        setConnectedPeers(peers)
      } catch { /* noop */ }
    }

    awareness.on('change', handleAwarenessChange)
    handleAwarenessChange()

    const yShared = ydoc.getMap('shared-canvas')

    const applyInbound = () => {
      try {
        const jsonStr = yShared.get('json') as string | undefined
        if (!jsonStr) return
        const data = JSON.parse(jsonStr)
        const canvas = (window as any).fabricCanvas
        const canvasReady = (window as any).canvasReady
        if (!canvas || !canvasReady) return
        // Deduplication: if we were the sender and payload matches last sent, skip
        const senderId = yShared.get('senderId') as number | undefined
        const myId = (window as any).ydoc?.clientID as number | undefined
        const lastSent = (window as any)._lastSentCanvasJson as string | undefined
        if (myId && senderId && myId === senderId && lastSent && lastSent === jsonStr) {
          return
        }
        // Deduplication: if inbound equals current canvas state, skip
        try {
          const current = canvas.toJSON()
            ; (current as any).width = canvas.getWidth()
            ; (current as any).height = canvas.getHeight()
          const currentStr = JSON.stringify(current)
          if (currentStr === jsonStr) {
            return
          }
        } catch { }
        ; (window as any)._lastAppliedCanvasJson = jsonStr
          // Prevent outbound echo while applying
          ; (window as any)._suppressCounter = true
        canvas.loadFromJSON(data, () => {
          try {
            canvas.renderAll()
            setTimeout(() => {
              canvas.requestRenderAll()
              // extend suppression window slightly to avoid late events
              setTimeout(() => { (window as any)._suppressCounter = false }, 150)
            }, 50)
          } catch {
            ; (window as any)._suppressCounter = false
          }
        })
      } catch (e) {
        console.warn('⚠️ Failed to apply inbound canvas json:', e)
      }
    }

    // Initial apply if present
    applyInbound()
    // Observe updates
    const observer = () => applyInbound()
    yShared.observe(observer)

      // Expose ydoc globally for Canvas to use
      ; (window as any).ydoc = ydoc

    return () => {
      yShared.unobserve(observer)
      awareness.off('change', handleAwarenessChange)
      provider.destroy()
      ydoc.destroy()
    }
  }, [id])

  // Load canvas from API on mount
  useEffect(() => {
    const loadCanvasDesign = async () => {
      if (!id) return;

      setIsLoadingCanvas(true);

      try {
        const result = await loadCanvas(id);

        // Check if canvas has any objects to load
        const hasObjects = result.data?.designData?.objects?.length > 0;

        if (hasObjects) {
          // Wait for canvas to be initialized
          const waitForCanvas = () => {
            const canvas = (window as any).fabricCanvas;
            const canvasReady = (window as any).canvasReady;

            if (canvas && canvasReady) {

              // Load the design data into the canvas (suppress counter during initial load)
              ; (window as any)._suppressCounter = true
              canvas.loadFromJSON(result.data.designData, () => {

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

                  setIsLoadingCanvas(false);
                  // Re-enable counter after initial load settles
                  setTimeout(() => { (window as any)._suppressCounter = false }, 50)
                }, 200);
              }, (fabricObjects: any, error: any) => {
                if (error) {
                  console.error('❌ Error loading canvas objects:', error);
                  setIsLoadingCanvas(false);
                  ; (window as any)._suppressCounter = false
                } else {
                  console.log('📦 Objects loaded:', fabricObjects?.length);
                }
              });
            } else {
              // Retry if canvas not ready yet
              setTimeout(waitForCanvas, 50);
            }
          };

          waitForCanvas();
        } else {
          // No objects to load, just wait for canvas to be ready
          const waitForCanvas = () => {
            const canvas = (window as any).fabricCanvas;
            const canvasReady = (window as any).canvasReady;

            if (canvas && canvasReady) {
              setIsLoadingCanvas(false);
            } else {
              setTimeout(waitForCanvas, 50);
            }
          };
          waitForCanvas();
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

  // Autosave canvas every 30 seconds (only if data changed)
  useEffect(() => {
    if (!id) return;

    const autosave = async () => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) return;

      try {
        const designData = canvas.toJSON();
        designData.width = canvas.getWidth();
        designData.height = canvas.getHeight();

        // Serialize current data to compare
        const currentDataString = JSON.stringify(designData);

        // Only save if data has changed
        if (currentDataString === lastSavedDataRef.current) {
          console.log('ℹ️ No changes detected, skipping autosave');
          return;
        }

        await updateCanvas(id, {
          designData,
          metadata: {
            title: 'My Design'
          }
        });

        // Update last saved data
        lastSavedDataRef.current = currentDataString;
        console.log('💾 Autosave completed at', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('❌ Autosave error:', error);
      }
    };

    // Start autosave interval
    const autosaveInterval = setInterval(autosave, 10000); // 30 seconds

    return () => {
      clearInterval(autosaveInterval);
    };
  }, [id]);

  // Update last saved data reference after initial load
  useEffect(() => {
    const canvas = (window as any).fabricCanvas;
    if (canvas) {
      const designData = canvas.toJSON();
      designData.width = canvas.getWidth();
      designData.height = canvas.getHeight();
      lastSavedDataRef.current = JSON.stringify(designData);
    }
  }, [isLoadingCanvas]);

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
      {/* Presence indicator: show other users' initials */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: connectionStatus === 'connected' ? '#4ade80' : '#ef4444' }} />
        {connectedPeers.length === 0 ? (
          <span>You are alone in this :(</span>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            {connectedPeers.map((p) => (
              <div
                key={p.id || p.name}
                title={p.name}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: getPeerColor(p.id || p.name),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#333',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
              >
                {p.initials}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoadingCanvas && <Loader title="Loading Canvas" text="Preparing your editor..." />}

      <Sidebar onShapesClick={handleShapesClick} canvasId={id} />
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

export default Editor
