import './Loader.css';

interface LoaderProps {
  title?: string;
  text?: string;
}

const Loader = ({ title = 'Loading Canvas', text = 'Preparing your editor...' }: LoaderProps) => {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="modern-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h3 className="loading-title">{title}</h3>
        <p className="loading-text">{text}</p>
      </div>
    </div>
  );
};

export default Loader;

