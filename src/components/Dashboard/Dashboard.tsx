import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { BsFileText } from 'react-icons/bs';
import { listCanvases, type CanvasListItem } from '../../services/canvasApi';
import Loader from '../Loader/Loader';
import './Dashboard.css';

const Dashboard = () => {
  const [canvases, setCanvases] = useState<CanvasListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCanvases = async () => {
      try {
        setIsLoading(true);
        const result = await listCanvases(50, 0);
        if (result.success && result.data) {
          setCanvases(result.data);
        }
      } catch (error) {
        console.error('Error fetching canvases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCanvases();
  }, []);

  const handleCreateNew = () => {
    const newId = uuidv4();
    navigate(`/editor/${newId}`);
  };

  const handleCanvasClick = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">My Designs</h1>
        <button className="create-new-btn" onClick={handleCreateNew}>
          + Create New Design
        </button>
      </div>

      <div className="dashboard-content">
        {isLoading ? (
          <Loader title="Loading Designs" text="Fetching your designs..." />
        ) : canvases.length === 0 ? (
          <div className="dashboard-empty">
            <BsFileText className="empty-icon" />
            <h3>No designs yet</h3>
            <p>Create your first design to get started!</p>
            <button className="create-first-btn" onClick={handleCreateNew}>
              Create New Design
            </button>
          </div>
        ) : (
          <div className="canvas-grid">
            {canvases.map((canvas) => {
              const canvasId = canvas._id || canvas.id || '';
              return (
                <div
                  key={canvasId}
                  className="canvas-card"
                  onClick={() => handleCanvasClick(canvasId)}
                >
                  <div className="canvas-card-preview">
                    <div className="canvas-placeholder">
                      {canvas.metadata?.title?.[0]?.toUpperCase() || 'D'}
                    </div>
                  </div>
                  <div className="canvas-card-info">
                    <h3 className="canvas-card-title">
                      {canvas.metadata?.title || 'Untitled Design'}
                    </h3>
                    <p className="canvas-card-date">
                      Updated: {formatDate(canvas.metadata?.updatedAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

