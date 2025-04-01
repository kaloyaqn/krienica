import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export default function DrawingCanvas({ map, onZoneCreated, onCancel }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const bounds = map.getBounds();
  const size = map.getSize();

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = size.x;
    canvas.height = size.y;
    
    const context = canvas.getContext('2d');
    context.strokeStyle = '#4CAF50';
    context.lineWidth = 3;
    context.lineCap = 'round';
    contextRef.current = context;

    // Disable map interactions while drawing
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();

    return () => {
      // Re-enable map interactions
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      if (map.tap) map.tap.enable();
    };
  }, [map]);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    
    // Convert canvas coordinates to map coordinates
    const point = L.point(offsetX, offsetY);
    const latlng = map.containerPointToLatLng(point);
    setPoints([latlng]);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;

    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    // Convert canvas coordinates to map coordinates
    const point = L.point(offsetX, offsetY);
    const latlng = map.containerPointToLatLng(point);
    setPoints(prev => [...prev, latlng]);
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);

    if (points.length < 3) return;

    // Calculate the center and radius of the drawn shape
    const bounds = L.latLngBounds(points);
    const center = bounds.getCenter();
    
    // Calculate average distance from center to all points as radius
    const radius = points.reduce((sum, point) => {
      return sum + center.distanceTo(point);
    }, 0) / points.length;

    // Create zone without asking for name
    onZoneCreated({
      center: [center.lat, center.lng],
      radius: radius
    });
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="absolute inset-0 z-[1000]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          const rect = e.target.getBoundingClientRect();
          const offsetX = touch.clientX - rect.left;
          const offsetY = touch.clientY - rect.top;
          startDrawing({ nativeEvent: { offsetX, offsetY } });
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          const rect = e.target.getBoundingClientRect();
          const offsetX = touch.clientX - rect.left;
          const offsetY = touch.clientY - rect.top;
          draw({ nativeEvent: { offsetX, offsetY } });
        }}
        onTouchEnd={stopDrawing}
      />
      <div className="absolute top-4 right-4 space-x-2">
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-colors"
        >
          Отказ
        </button>
      </div>
      <div className="absolute bottom-21 left-1/2 transform -translate-x-1/2">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow p-4 text-center">
          <p className="text-gray-800 font-medium">
            Начертайте зона с пръст или мишка
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Очертайте приблизително кръгла форма
          </p>
        </div>
      </div>
    </div>
  );
} 