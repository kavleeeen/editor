import { useState, useEffect, useRef } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
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
import CommentPanel from './components/CommentPanel/CommentPanel'
import ShareModal from './components/ShareModal/ShareModal'
import { updateSelectedElementColor, setActivePanel } from './store/canvasSlice'
import { loadCanvas, updateCanvas } from './services/canvasApi'
import { uploadFile } from './services/uploadApi'
import { canvasToPngFile } from './utils/canvasToPng'
import { selectActivePanel, selectSelectedElement } from './store/selectors'
import { colors } from './constants/colors'
import './Editor.css'
import { getUserFromToken } from './services/authApi'
import { BsHouse } from 'react-icons/bs'

function Editor() {
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true)
  const [canvasTitle, setCanvasTitle] = useState<string>('Untitled')
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const [connectedPeers, setConnectedPeers] = useState<{ id: string; name: string; initials: string }[]>([])
  const [titleEditingPeers, setTitleEditingPeers] = useState<{ id: string; name: string; initials: string }[]>([])
  const selectedElement = useSelector(selectSelectedElement)
  const activePanel = useSelector(selectActivePanel)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const lastSavedDataRef = useRef<string>('')
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dispatch = useDispatch()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Redirect to dashboard if no ID (this should not happen with proper routing)
  if (!id) {
    return <Navigate to="/dashboard" replace />
  }

  const handleFontClick = () => dispatch(setActivePanel('font'))
  const handleColorClick = () => dispatch(setActivePanel('color'))
  const handleShapesClick = () => dispatch(setActivePanel('shapes'))
  const closePanel = () => dispatch(setActivePanel(null))

  // Auto-save function
  const performAutoSave = async () => {
    if (!id) return

    const canvas = (window as any).fabricCanvas
    if (!canvas) return

    try {
      const designData = canvas.toJSON()
      designData.width = canvas.getWidth()
      designData.height = canvas.getHeight()

      // Serialize current data to compare
      const currentDataString = JSON.stringify(designData)

      // Only save if data has changed
      if (currentDataString === lastSavedDataRef.current) {
        return
      }

      // Convert canvas to PNG and upload it
      let imageUrl: string | undefined
      try {
        const pngFile = await canvasToPngFile(canvas, `canvas-${id}-${Date.now()}.png`)
        const uploadResult = await uploadFile(pngFile)
        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url
          console.log('📸 Canvas PNG uploaded successfully:', imageUrl)
        } else {
          console.warn('⚠️ PNG upload failed, proceeding without imageUrl')
        }
      } catch (uploadError) {
        console.error('❌ PNG upload error:', uploadError)
        // Continue with save even if PNG upload fails
      }

      await updateCanvas(id, {
        designData,
        metadata: {
          title: canvasTitle || 'Untitled'
        },
        imageUrl
      })

      // Update last saved data
      lastSavedDataRef.current = currentDataString
      console.log('💾 Auto-save completed at', new Date().toLocaleTimeString())
    } catch (error) {
      console.error('❌ Auto-save error:', error)
    }
  }

  // Save only the title (along with current design data to avoid dropping content)
  const saveTitle = async () => {
    try {
      const canvas = (window as any).fabricCanvas
      if (!canvas) return
      const designData = canvas.toJSON()
        ; (designData as any).width = canvas.getWidth()
        ; (designData as any).height = canvas.getHeight()

      // Sync title through Yjs first
      const ydoc = (window as any).ydoc
      if (ydoc) {
        const yShared = ydoc.getMap('shared-canvas')
        const senderId = ydoc.clientID
        const senderTs = Date.now()
        ydoc.transact(() => {
          yShared.set('title', canvasTitle || 'Untitled')
          yShared.set('titleSenderId', senderId)
          yShared.set('titleSenderTs', senderTs)
        }, { source: 'title-sync', clientId: senderId })
        console.log('📝 Title synced through Yjs:', canvasTitle)
      }

      // Convert canvas to PNG and upload it
      let imageUrl: string | undefined
      try {
        const pngFile = await canvasToPngFile(canvas, `canvas-${id}-${Date.now()}.png`)
        const uploadResult = await uploadFile(pngFile)
        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url
          console.log('📸 Canvas PNG uploaded successfully for title save:', imageUrl)
        } else {
          console.warn('⚠️ PNG upload failed during title save, proceeding without imageUrl')
        }
      } catch (uploadError) {
        console.error('❌ PNG upload error during title save:', uploadError)
        // Continue with save even if PNG upload fails
      }

      await updateCanvas(id, {
        designData,
        metadata: { title: canvasTitle || 'Untitled' },
        imageUrl
      })
    } catch (e) {
      console.error('❌ Failed to save title', e)
    }
  }

  // Reset auto-save timer
  const resetAutoSaveTimer = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    autoSaveTimeoutRef.current = setTimeout(performAutoSave, 2500) // 3.5 seconds
  }

  // Helper functions for title editing awareness
  const updateTitleEditingState = (editing: boolean) => {
    const awareness = (window as any).awareness
    if (awareness) {
      awareness.setLocalStateField('editingTitle', editing)
    }
  }

  const handleTitleEditStart = () => {
    setIsEditingTitle(true)
    updateTitleEditingState(true)
  }

  const handleTitleEditEnd = () => {
    setIsEditingTitle(false)
    updateTitleEditingState(false)
  }

  // Focus title input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

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
    const provider = new WebsocketProvider(import.meta.env.VITE_VITE_WS_BE_URL || 'ws://localhost:1234', id, ydoc)



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

    // Track title editing state
    awareness.setLocalStateField('editingTitle', false)

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

        // Track peers editing the title
        const titleEditingPeers = Array.from(statesMap.entries())
          .filter(([clientId]) => clientId !== selfClientId)
          .filter(([, state]) => state?.editingTitle === true)
          .map(([, state]) => {
            const u = state?.user || {}
            return {
              id: u.id || '',
              name: u.name || 'Guest',
              initials: (u.initials || computeInitials(u.name, u.email) || '??') as string
            }
          })
        setTitleEditingPeers(titleEditingPeers)
      } catch { /* noop */ }
    }

    awareness.on('change', handleAwarenessChange)
    handleAwarenessChange()

    const yShared = ydoc.getMap('shared-canvas')

    // Handle title synchronization
    const handleTitleSync = () => {
      try {
        const sharedTitle = yShared.get('title') as string | undefined
        const titleSenderId = yShared.get('titleSenderId') as number | undefined
        const myId = (window as any).ydoc?.clientID as number | undefined

        // Only update if the title came from another user and is different
        // Also ensure we don't override a title that was just loaded from the API
        if (sharedTitle && titleSenderId && myId && titleSenderId !== myId && sharedTitle !== canvasTitle) {
          // Only sync title from peers after initial load is complete
          if (isInitialLoadComplete) {
            setCanvasTitle(sharedTitle)
            console.log('📝 Title synced from peer:', sharedTitle)
          } else {
            console.log('📝 Skipping title sync during initial load')
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to sync title:', e)
      }
    }

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
    // Initial title sync
    handleTitleSync()

    // Observe updates
    const observer = () => applyInbound()
    const titleObserver = () => handleTitleSync()
    yShared.observe(observer)
    yShared.observe(titleObserver)

      // Expose ydoc and awareness globally for Canvas and title editing to use
      ; (window as any).ydoc = ydoc
      ; (window as any).awareness = awareness

    return () => {
      yShared.unobserve(observer)
      yShared.unobserve(titleObserver)
      awareness.off('change', handleAwarenessChange)
      provider.destroy()
      ydoc.destroy()
    }
  }, [id])

  // Set up auto-save timer reset on canvas changes
  useEffect(() => {
    const canvas = (window as any).fabricCanvas
    if (!canvas) return

    // Reset timer on any canvas action
    const resetTimer = () => resetAutoSaveTimer()

    // Listen to all canvas events that indicate changes
    canvas.on('object:added', resetTimer)
    canvas.on('object:modified', resetTimer)
    canvas.on('object:removed', resetTimer)
    canvas.on('history:undo', resetTimer)
    canvas.on('history:redo', resetTimer)

    // Start the initial timer
    resetAutoSaveTimer()

    return () => {
      canvas.off('object:added', resetTimer)
      canvas.off('object:modified', resetTimer)
      canvas.off('object:removed', resetTimer)
      canvas.off('history:undo', resetTimer)
      canvas.off('history:redo', resetTimer)

      // Clear any pending auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [isLoadingCanvas]) // Re-run when canvas is loaded

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
          // Set initial title if present
          const initialTitle = result.data?.metadata?.title
          if (initialTitle) {
            setCanvasTitle(initialTitle)
            // Sync the loaded title to Yjs shared state
            const ydoc = (window as any).ydoc
            if (ydoc) {
              const yShared = ydoc.getMap('shared-canvas')
              const senderId = ydoc.clientID
              const senderTs = Date.now()
              ydoc.transact(() => {
                yShared.set('title', initialTitle)
                yShared.set('titleSenderId', senderId)
                yShared.set('titleSenderTs', senderTs)
              }, { source: 'title-load', clientId: senderId })
              console.log('📝 Title loaded from API and synced to Yjs:', initialTitle)
            }
          }
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
                  setIsInitialLoadComplete(true);
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
          // Set title even when no objects
          const initialTitle = result.data?.metadata?.title
          if (initialTitle) {
            setCanvasTitle(initialTitle)
            // Sync the loaded title to Yjs shared state
            const ydoc = (window as any).ydoc
            if (ydoc) {
              const yShared = ydoc.getMap('shared-canvas')
              const senderId = ydoc.clientID
              const senderTs = Date.now()
              ydoc.transact(() => {
                yShared.set('title', initialTitle)
                yShared.set('titleSenderId', senderId)
                yShared.set('titleSenderTs', senderTs)
              }, { source: 'title-load', clientId: senderId })
              console.log('📝 Title loaded from API and synced to Yjs:', initialTitle)
            }
          }
          // No objects to load, just wait for canvas to be ready
          const waitForCanvas = () => {
            const canvas = (window as any).fabricCanvas;
            const canvasReady = (window as any).canvasReady;

            if (canvas && canvasReady) {
              setIsLoadingCanvas(false);
              setIsInitialLoadComplete(true);
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
      const padding = 50
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

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }

      const canvas = (window as any).fabricCanvas
      if (!canvas) return

      // Check if we're editing text - if so, let Fabric.js handle ALL keyboard events
      const activeObj = canvas.getActiveObject()
      if (activeObj && activeObj.type === 'textbox') {
        const textObj = activeObj as any
        // If text is in editing mode, don't interfere with any keyboard events
        if (textObj.isEditing) {
          return // Let Fabric.js handle all text editing
        }
      }

      // Delete key - remove selected object
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        if (activeObj) {
          canvas.remove(activeObj)
          canvas.renderAll()

          // Manually trigger history save for deletion
          if (canvas._historySaveAction) {
            canvas._historySaveAction({ target: activeObj })
          }

          // Trigger collaborative sync
          if ((canvas as any)._forceSync) {
            (canvas as any)._forceSync()
          }
        }
        return
      }

      // Escape key - deselect all objects
      if (event.key === 'Escape') {
        event.preventDefault()
        canvas.discardActiveObject()
        canvas.renderAll()
        return
      }

      // Ctrl+Z or Cmd+Z - undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        if (canvas.historyUndoAction) {
          canvas.historyUndoAction()
        }
        return
      }

      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z - redo
      if (((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z')) {
        event.preventDefault()
        if (canvas.historyRedoAction) {
          canvas.historyRedoAction()
        }
        return
      }

      // Ctrl+A or Cmd+A - select all objects
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault()
        canvas.discardActiveObject()
        const objects = canvas.getObjects()
        if (objects.length > 0) {
          const selection = new (window as any).fabric.ActiveSelection(objects, {
            canvas: canvas,
          })
          canvas.setActiveObject(selection)
          canvas.renderAll()
        }
        return
      }

      // Arrow keys - move selected objects
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const activeObj = canvas.getActiveObject()
        if (activeObj) {
          // Determine movement amount (larger with Shift key)
          const moveAmount = event.shiftKey ? 10 : 1

          let deltaX = 0
          let deltaY = 0

          switch (event.key) {
            case 'ArrowLeft':
              deltaX = -moveAmount
              break
            case 'ArrowRight':
              deltaX = moveAmount
              break
            case 'ArrowUp':
              deltaY = -moveAmount
              break
            case 'ArrowDown':
              deltaY = moveAmount
              break
          }

          // Move the object(s)
          activeObj.set({
            left: activeObj.left + deltaX,
            top: activeObj.top + deltaY
          })

          // Set coordinates for all objects in selection if it's a multi-selection
          if (activeObj.type === 'activeSelection') {
            activeObj.forEachObject((obj: any) => {
              obj.set({
                left: obj.left + deltaX,
                top: obj.top + deltaY
              })
              // Update coordinates for each object in the selection
              obj.setCoords()
            })
            // Update coordinates for the entire selection
            activeObj.setCoords()
          } else {
            // Update coordinates for single object
            activeObj.setCoords()
          }

          canvas.renderAll()

          // Manually trigger history save for movement
          if (canvas._historySaveAction) {
            canvas._historySaveAction({ target: activeObj })
          }

          // Trigger collaborative sync
          if ((canvas as any)._forceSync) {
            (canvas as any)._forceSync()
          }
        }
        return
      }
    }

    // Add event listener to document for global keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown)

    // Also add click handler to focus canvas when clicked (but not when editing text)
    const handleCanvasClick = () => {
      const canvas = (window as any).fabricCanvas
      if (canvas && canvas.getElement()) {
        const activeObj = canvas.getActiveObject()
        // Only focus canvas if we're not editing text
        if (!activeObj || activeObj.type !== 'textbox' || !(activeObj as any).isEditing) {
          canvas.getElement().focus()
        }
      }
    }

    // Add click listener to canvas wrapper to ensure focus
    const canvasWrapper = canvasWrapperRef.current
    if (canvasWrapper) {
      canvasWrapper.addEventListener('click', handleCanvasClick)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (canvasWrapper) {
        canvasWrapper.removeEventListener('click', handleCanvasClick)
      }
    }
  }, [])

  return (
    <div className="app">
      {/* Unified Sticky Toolbar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Left: Home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            title="Home"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 110, height: 32,
              borderRadius: 6,
              color: '#000',
              border: '1px solid #e5e7eb',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 16,
              gap: 6
            }}
          >
            Home <BsHouse />
          </button>

          {/* Inline title: click to edit */}
          {isEditingTitle ? (
            <div style={{ position: 'relative' }}>
              <input
                ref={titleInputRef}
                value={canvasTitle}
                onChange={(e) => setCanvasTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveTitle()
                    handleTitleEditEnd()
                  } else if (e.key === 'Escape') {
                    handleTitleEditEnd()
                  }
                }}
                onBlur={() => {
                  saveTitle()
                  handleTitleEditEnd()
                }}
                placeholder="Untitled"
                style={{
                  border: '1px solid #e5e7eb',
                  height: 32,
                  borderRadius: 6,
                  padding: '0 10px',
                  fontSize: 16,
                  width: 260
                }}
              />
              {/* Show other users editing the title */}
              {titleEditingPeers.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  display: 'flex',
                  gap: '2px'
                }}>
                  {titleEditingPeers.map((peer) => (
                    <div
                      key={peer.id}
                      title={`${peer.name} is editing the title`}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: getPeerColor(peer.id),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        fontWeight: 600,
                        color: '#333',
                        border: '1px solid #fff',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {peer.initials}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
              <div style={{ position: 'relative' }}>
                <div
                  title={titleEditingPeers.length > 0 ? `${titleEditingPeers.map(p => p.name).join(', ')} is editing the title` : "Click to edit"}
                  onClick={() => {
                    if (titleEditingPeers.length === 0) {
                      handleTitleEditStart()
                    }
                  }}
                  style={{
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    borderRadius: 6,
                    fontSize: 16,
                    cursor: titleEditingPeers.length > 0 ? 'not-allowed' : 'text',
                    minWidth: 120,
                    maxWidth: 360,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: titleEditingPeers.length > 0 ? '#9ca3af' : '#1f2937',
                    opacity: titleEditingPeers.length > 0 ? 0.7 : 1
                  }}
                >
                  {canvasTitle || 'Untitled'}
                </div>
                {/* Show other users editing the title */}
                {titleEditingPeers.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    display: 'flex',
                    gap: '2px'
                  }}>
                    {titleEditingPeers.map((peer) => (
                      <div
                        key={peer.id}
                        title={`${peer.name} is editing the title`}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: getPeerColor(peer.id),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 8,
                          fontWeight: 600,
                          color: '#333',
                          border: '1px solid #fff',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {peer.initials}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Center: Element controls only */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <ElementToolbar onFontClick={handleFontClick} onColorClick={handleColorClick} />
        </div>

        {/* Right side: Undo/Redo, then Connection Status & Presence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Undo/Redo to the left of connection status */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UndoRedoToolbar canvas={(window as any).fabricCanvas as any} isLoadingCanvas={isLoadingCanvas} />
          </div>

          {/* Gap between undo/redo and status */}
          <div style={{ width: 24 }} />



          {/* Presence: show other users' initials */}
          {connectedPeers.length === 0 ? (
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>You are alone in this :(</span>
          ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                {connectedPeers.map((p) => (
                  <div
                    key={p.id || p.name}
                    title={p.name}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: getPeerColor(p.id || p.name),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#333',
                      border: '2px solid #fff',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {p.initials}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ paddingTop: '60px' }}>
        {/* Loading overlay */}
        {isLoadingCanvas && <Loader title="Loading Canvas" text="Preparing your editor..." />}

        <Sidebar onShapesClick={handleShapesClick} canvasId={id} canvasTitle={canvasTitle} />
        <div className="main-content">
          {/* ElementToolbar moved to sticky toolbar above */}
        </div>

        <div className={`canvas-viewport ${activePanel ? 'with-panel' : ''}`}>
          <Canvas wrapperRef={canvasWrapperRef} />
        </div>


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
                // Trigger collaborative sync
                if ((canvas as any)._forceSync) {
                  (canvas as any)._forceSync()
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
                  // Trigger collaborative sync
                  if ((canvas as any)._forceSync) {
                    (canvas as any)._forceSync()
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
                  // Trigger collaborative sync
                  if ((canvas as any)._forceSync) {
                    (canvas as any)._forceSync()
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

        {/* Comment Panel */}
        <CommentPanel canvasId={id} />

        {/* Share Modal */}
        <ShareModal canvasId={id} canvasTitle={canvasTitle} />
      </div>
    </div>
  )
}

export default Editor
