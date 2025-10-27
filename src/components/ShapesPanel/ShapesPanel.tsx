import { Canvas, Rect, Circle, Triangle, Ellipse, Polygon } from 'fabric';
import { colors } from '../../constants/colors';
import Panel from '../Panel/Panel';

interface ShapesPanelProps {
  onClose: () => void;
}

const ShapesPanelContent = ({ onClose }: ShapesPanelProps) => {
  const addShape = (shapeType: string) => {
    const canvas = (window as any).fabricCanvas as Canvas;
    if (!canvas) return;

    let shape;
    const fill = colors.shapeFill;
    const stroke = colors.shapeStroke;
    const strokeWidth = 2;

    // Center position on canvas
    const canvasCenterX = canvas.width! / 2;
    const canvasCenterY = canvas.height! / 2;

    switch (shapeType) {
      case 'rectangle': {
        const width = 150;
        const height = 100;
        shape = new Rect({
          left: canvasCenterX - width / 2,
          top: canvasCenterY - height / 2,
          width,
          height,
          fill,
          stroke,
          strokeWidth,
        });
        break;
      }
      case 'circle': {
        const radius = 50;
        shape = new Circle({
          left: canvasCenterX - radius,
          top: canvasCenterY - radius,
          radius,
          fill,
          stroke,
          strokeWidth,
        });
        break;
      }
      case 'triangle': {
        const width = 100;
        const height = 100;
        shape = new Triangle({
          left: canvasCenterX - width / 2,
          top: canvasCenterY - height / 2,
          width,
          height,
          fill,
          stroke,
          strokeWidth,
        });
        break;
      }
      case 'ellipse': {
        const rx = 75;
        const ry = 50;
        shape = new Ellipse({
          left: canvasCenterX - rx,
          top: canvasCenterY - ry,
          rx,
          ry,
          fill,
          stroke,
          strokeWidth,
        });
        break;
      }
      case 'hexagon': {
        const points = [
          { x: 50, y: 0 },
          { x: 0, y: 30 },
          { x: 0, y: 70 },
          { x: 50, y: 100 },
          { x: 100, y: 70 },
          { x: 100, y: 30 },
        ];
        // Adjust points to center the polygon
        shape = new Polygon(points, {
          left: canvasCenterX - 50,
          top: canvasCenterY - 50,
          fill,
          stroke,
          strokeWidth,
        });
        break;
      }
      case 'star': {
        const starPoints = [
          { x: 50, y: 0 },
          { x: 55, y: 35 },
          { x: 90, y: 35 },
          { x: 60, y: 55 },
          { x: 70, y: 90 },
          { x: 50, y: 70 },
          { x: 30, y: 90 },
          { x: 40, y: 55 },
          { x: 10, y: 35 },
          { x: 45, y: 35 },
        ];
        // Adjust points to center the star
        shape = new Polygon(starPoints, {
          left: canvasCenterX - 50,
          top: canvasCenterY - 50,
          fill,
          stroke,
          strokeWidth,
        });
        break;
      }
      default:
        return;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
  };

  const shapes = [
    { id: 'rectangle', name: 'Rectangle', emoji: '⬜' },
    { id: 'circle', name: 'Circle', emoji: '⭕' },
    { id: 'triangle', name: 'Triangle', emoji: '🔺' },
    { id: 'ellipse', name: 'Ellipse', emoji: '🔵' },
    { id: 'hexagon', name: 'Hexagon', emoji: '⬡' },
    { id: 'star', name: 'Star', emoji: '⭐' },
  ];

  return (
    <div>
      {shapes.map((shape) => (
        <button
          key={shape.id}
          className="panel-item"
          onClick={() => addShape(shape.id)}
        >
          <span>{shape.emoji}</span>
          <span>{shape.name}</span>
        </button>
      ))}
    </div>
  );
};

const ShapesPanel = ({ onClose }: ShapesPanelProps) => {
  return (
    <Panel title="Shapes" onClose={onClose}>
      <ShapesPanelContent onClose={onClose} />
    </Panel>
  );
};

export default ShapesPanel;

