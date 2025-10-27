import { ReactNode } from 'react';
import './Panel.css';

interface PanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const Panel = ({ title, onClose, children }: PanelProps) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">{title}</h3>
        <button className="panel-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="panel-content">
        {children}
      </div>
    </div>
  );
};

export default Panel;

