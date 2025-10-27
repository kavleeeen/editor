import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store/store';
import { updateCanvasState } from '../../store/canvasSlice';
import type { Canvas, FabricObject } from 'fabric';
import './LayersPanel.css';

interface LayerItem {
  id: string;
  name: string;
  type: string;
  object: FabricObject;
}

const LayersPanel = () => {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LayerItem | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customNames = useRef<Map<string, string>>(new Map());

  const selectedElement = useSelector((state: RootState) => state.canvas.selectedElement);
  const dispatch = useDispatch();

  const updateLayers = useCallback(() => {
    const canvas = (window as unknown as { fabricCanvas?: Canvas }).fabricCanvas;
    if (!canvas) {
      setLayers([]);
      return;
    }

    const objects = canvas.getObjects();
    const layersList: LayerItem[] = objects.map((obj, index) => {
      const objWithName = obj as FabricObject & { name?: string };
      const type = obj.type || 'rect';

      // Use the object's name as ID, or generate one
      const objectName = objWithName.name;
      const objectId = objectName || `layer-${index}`;

      // Check for custom name in our Map - try both objectId and objectName
      const customName = customNames.current.get(objectId) ||
        (objectName ? customNames.current.get(objectName) : undefined);

      const name = customName || `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`;

      return {
        id: objectId,
        name,
        type,
        object: obj
      };
    });

    // Reverse so top of list = top on canvas
    layersList.reverse();
    setLayers(layersList);
  }, []);

  useEffect(() => {
    updateLayers();

    // Listen to canvas changes
    const canvas = (window as unknown as { fabricCanvas?: Canvas }).fabricCanvas;
    if (canvas) {
      // Load custom names from saved objects
      const objects = canvas.getObjects();
      objects.forEach((obj) => {
        const objWithName = obj as FabricObject & { name?: string };
        if (objWithName.name && objWithName.name !== '') {
          const customName = objWithName.name;
          // Check if this is a custom name (not just the object ID)
          const objectId = objWithName.name || `layer-${objects.indexOf(obj)}`;
          // Only set if it's a proper custom name (not auto-generated)
          if (!customName.startsWith('textbox-') && !customName.startsWith('rect-') &&
            !customName.startsWith('circle-') && !customName.startsWith('image-')) {
            customNames.current.set(objectId, customName);
          }
        }
      });

      canvas.on('object:added', updateLayers);
      canvas.on('object:removed', updateLayers);
      canvas.on('object:modified', updateLayers);

      return () => {
        canvas.off('object:added', updateLayers);
        canvas.off('object:removed', updateLayers);
        canvas.off('object:modified', updateLayers);
      };
    }
  }, [updateLayers]);

  const handleLayerClick = (layer: LayerItem) => {
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Wait a bit to allow double-click to fire
    clickTimeoutRef.current = setTimeout(() => {
      const canvas = (window as unknown as { fabricCanvas?: Canvas }).fabricCanvas;
      if (!canvas) return;

      canvas.setActiveObject(layer.object);
      canvas.renderAll();
    }, 200);
  };

  const handleDoubleClick = (layer: LayerItem) => {
    // Cancel the pending click
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const handleNameSave = () => {
    if (!editingId) return;

    const canvas = (window as unknown as { fabricCanvas?: Canvas }).fabricCanvas;
    if (!canvas) return;

    const layer = layers.find(l => l.id === editingId);
    if (layer && editingName) {
      // Store custom name in our Map using the old ID
      customNames.current.set(editingId, editingName);

      // Also store using the new name as ID
      customNames.current.set(editingName, editingName);

      // Save to object for persistence
      (layer.object as FabricObject & { name?: string }).name = editingName;

      canvas.renderAll();
      // Update Redux state
      const json = canvas.toJSON();
      dispatch(updateCanvasState(json));

      // Immediately update the layers list to show the new name
      updateLayers();
    }

    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (layer: LayerItem) => {
    setDeleteConfirm(layer);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    const canvas = (window as unknown as { fabricCanvas?: Canvas }).fabricCanvas;
    if (!canvas) return;

    // Remove custom name from Map
    customNames.current.delete(deleteConfirm.id);

    canvas.remove(deleteConfirm.object);
    canvas.renderAll();

    // Manually trigger history save for layer deletion
    if (canvas._historySaveAction) {
      canvas._historySaveAction({ target: deleteConfirm.object });
    }
    setDeleteConfirm(null);
  };

  const handleDragStart = (e: React.DragEvent, layer: LayerItem) => {
    setDraggedId(layer.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', layer.id);
  };

  const handleDragOver = (e: React.DragEvent, layer: LayerItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(layer.id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetLayer: LayerItem) => {
    e.preventDefault();

    if (!draggedId || draggedId === targetLayer.id) {
      return;
    }

    const canvas = (window as unknown as { fabricCanvas?: Canvas }).fabricCanvas;
    if (!canvas) return;

    const draggedLayer = layers.find(l => l.id === draggedId);
    if (!draggedLayer) return;

    const draggedIndex = layers.indexOf(draggedLayer);
    const targetIndex = layers.indexOf(targetLayer);

    if (draggedIndex === targetIndex) return;

    // Get all objects from canvas
    const objects = canvas.getObjects();

    // Calculate the actual canvas index (layers array is reversed)
    const draggedCanvasIndex = objects.indexOf(draggedLayer.object);
    const targetCanvasIndex = objects.length - 1 - targetIndex;

    if (draggedCanvasIndex === targetCanvasIndex) return;

    // Remove the dragged object from its current position
    const removedObj = objects.splice(draggedCanvasIndex, 1)[0];

    // Calculate where to insert to place dragged object at target position
    // If we removed an object before the target, target index shifts by -1
    const insertPosition = targetCanvasIndex   // Target index unchanged

    // Clamp to valid range
    const clampedPosition = Math.max(0, Math.min(insertPosition, objects.length));

    // Insert at calculated position
    objects.splice(clampedPosition, 0, removedObj);

    // Re-add all objects to canvas in new order
    canvas.remove(...canvas.getObjects());
    canvas.add(...objects);

    // Update Redux state
    const json = canvas.toJSON();
    dispatch(updateCanvasState(json));

    canvas.renderAll();

    // Manually trigger history save for layer reordering
    if (canvas._historySaveAction) {
      canvas._historySaveAction({ target: null });
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  if (layers.length === 0) {
    return null;
  }

  const currentSelectedId = selectedElement?.objectId || null;

  return (
    <>
      <div className={`layers-panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="layers-panel-header">
          <div className="layers-header-content">
            <span className="layers-icon">📋</span>
            {!isCollapsed && <h3>Layers</h3>}
          </div>

        </div>

        {!isCollapsed && (
          <div className="layers-list">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`layer-item ${currentSelectedId === layer.id ? 'selected' : ''} ${draggedId === layer.id ? 'dragging' : ''} ${dragOverId === layer.id ? 'drag-over' : ''}`}
                onClick={() => handleLayerClick(layer)}
                onDoubleClick={() => handleDoubleClick(layer)}
                draggable
                onDragStart={(e) => handleDragStart(e, layer)}
                onDragOver={(e) => handleDragOver(e, layer)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, layer)}
                onDragEnd={handleDragEnd}
              >
                <div className="layer-preview">
                  {layer.type === 'textbox' && 'T'}
                  {layer.type === 'image' && 'I'}
                  {(layer.type === 'rect' || layer.type === 'circle' || layer.type === 'triangle' || layer.type === 'ellipse' || layer.type === 'polygon') && 'S'}
                </div>

                <div className="layer-content">
                  {editingId === layer.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameSave();
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingName('');
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="layer-name-input"
                    />
                  ) : (
                    <span className="layer-name">{layer.name}</span>
                  )}
                </div>

                <button
                  className="layer-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(layer);
                  }}
                  title="Delete layer"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="confirm-dialog-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Layer?</h3>
            <p>Are you sure you want to delete "{deleteConfirm.name}"?</p>
            <div className="confirm-dialog-buttons">
              <button onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button onClick={confirmDelete} className="confirm-btn">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LayersPanel;
