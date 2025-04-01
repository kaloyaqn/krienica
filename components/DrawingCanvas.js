import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export default function DrawingCanvas({ map, onZoneCreated, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [mouseData, setMouseData] = useState({ x: 0, y: 0 });
  const [canvasCTX, setCanvasCTX] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match map container
    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    
    // Set drawing style
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setCanvasCTX(ctx);

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

  const getPointFromEvent = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if (event.touches) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    // Scale coordinates to match canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: x * scaleX,
      y: y * scaleY
    };
  };

  const setPos = (event) => {
    event.preventDefault();
    const point = getPointFromEvent(event);
    setMouseData(point);
  };

  const draw = (event) => {
    event.preventDefault();
    if (!isDrawing) return;

    const point = getPointFromEvent(event);
    const ctx = canvasCTX;

    ctx.beginPath();
    ctx.moveTo(mouseData.x, mouseData.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setMouseData(point);

    // Convert canvas coordinates to map coordinates
    const mapPoint = L.point(point.x, point.y);
    const latlng = map.containerPointToLatLng(mapPoint);
    setPoints(prev => [...prev, latlng]);
  };

  const startDrawing = (event) => {
    event.preventDefault();
    setPos(event);
    setIsDrawing(true);
    
    // Convert initial point to map coordinates
    const point = getPointFromEvent(event);
    const mapPoint = L.point(point.x, point.y);
    const latlng = map.containerPointToLatLng(mapPoint);
    setPoints([latlng]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    if (points.length < 3) return;

    // Calculate the center and radius of the drawn shape
    const bounds = L.latLngBounds(points);
    const center = bounds.getCenter();
    
    // Calculate average distance from center to all points as radius
    const radius = points.reduce((sum, point) => {
      return sum + center.distanceTo(point);
    }, 0) / points.length;

    // Create zone
    onZoneCreated({
      center: [center.lat, center.lng],
      radius: radius
    });

    // Clear the canvas
    const ctx = canvasCTX;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setPoints([]);
  };

  const handleCancel = () => {
    // Clear the canvas
    const ctx = canvasCTX;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setPoints([]);
    setIsDrawing(false);
    onCancel();
  };

  return (
    <div className="absolute inset-0 z-[1000]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={(e) => {
          setPos(e);
          draw(e);
        }}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={(e) => {
          setPos(e);
          draw(e);
        }}
        onTouchEnd={stopDrawing}
        onTouchCancel={stopDrawing}
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