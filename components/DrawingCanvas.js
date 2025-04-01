import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const DrawingCanvas = ({ onZoneCreated, onCancel }) => {
  const map = useMap();
  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePosition, setMousePosition] = useState(null);
  const tempPolygonRef = useRef(null);
  const tempLineRef = useRef(null);

  // Update polygon when points change
  useEffect(() => {
    if (points.length >= 3) {
      if (tempPolygonRef.current) {
        map.removeLayer(tempPolygonRef.current);
      }
      
      tempPolygonRef.current = L.polygon(points, {
        color: '#4CAF50',
        fillOpacity: 0.2,
        weight: 2
      }).addTo(map);
    }
  }, [points, map]);

  useEffect(() => {
    console.log('DrawingCanvas mounted');

    const mapContainer = map.getContainer();
    const handleMapClick = (e) => {
      if (!isDrawing) return;
      
      const latlng = e.latlng;
      setPoints(prev => [...prev, latlng]);
    };

    const handleMove = (e) => {
      if (!isDrawing || points.length === 0) return;
      
      const latlng = e.latlng;
      setMousePosition(latlng);
      
      if (tempLineRef.current) {
        map.removeLayer(tempLineRef.current);
      }
      
      tempLineRef.current = L.polyline([
        points[points.length - 1],
        latlng
      ], {
        color: '#4CAF50',
        weight: 2,
        dashArray: '5, 10'
      }).addTo(map);
    };

    const handleTouchStart = (e) => {
      if (!isDrawing) return;
      
      // Prevent default touch behavior
      e.preventDefault();
      e.stopPropagation();
      
      const touch = e.touches[0];
      const latlng = map.containerPointToLatLng([touch.clientX, touch.clientY]);
      setPoints(prev => [...prev, latlng]);
    };

    // Disable map interactions while drawing
    map.dragging.disable();
    map.touchZoom.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();

    // Set cursor style
    mapContainer.style.cursor = 'crosshair';

    // Add event listeners
    map.on('click', handleMapClick);
    map.on('mousemove', handleMove);
    map.on('touchstart', handleTouchStart);
    map.on('touchmove', handleMove);

    // Cleanup function
    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMove);
      map.off('touchstart', handleTouchStart);
      map.off('touchmove', handleMove);
      
      if (tempPolygonRef.current) {
        map.removeLayer(tempPolygonRef.current);
      }
      if (tempLineRef.current) {
        map.removeLayer(tempLineRef.current);
      }
      
      // Re-enable map interactions
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();

      // Reset cursor style
      mapContainer.style.cursor = '';
    };
  }, [map, isDrawing, points, onZoneCreated]);

  // Handle cancel button click
  const handleCancel = (e) => {
    e.stopPropagation();
    e.preventDefault();
    L.DomEvent.stopPropagation(e);
    L.DomEvent.disableClickPropagation(e.currentTarget);
    L.DomEvent.disableTouchPropagation(e.currentTarget);
    
    if (tempPolygonRef.current) {
      map.removeLayer(tempPolygonRef.current);
    }
    if (tempLineRef.current) {
      map.removeLayer(tempLineRef.current);
    }
    setPoints([]);
    setMousePosition(null);
    setIsDrawing(false);
    onCancel();
  };

  // Handle finish button click
  const handleFinishClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    L.DomEvent.stopPropagation(e);
    L.DomEvent.disableClickPropagation(e.currentTarget);
    L.DomEvent.disableTouchPropagation(e.currentTarget);
    
    if (points.length >= 3) {
      const coordinates = [...points.map(point => [point.lat, point.lng])];
      coordinates.push(coordinates[0]); // Close the polygon
      onZoneCreated(coordinates);
      
      if (tempPolygonRef.current) {
        map.removeLayer(tempPolygonRef.current);
      }
      if (tempLineRef.current) {
        map.removeLayer(tempLineRef.current);
      }
      setPoints([]);
      setMousePosition(null);
      setIsDrawing(false);
    }
  };

  return (
    <div 
      className="absolute top-4 right-4 z-[1000]"
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        L.DomEvent.stopPropagation(e);
        L.DomEvent.disableClickPropagation(e.currentTarget);
        L.DomEvent.disableTouchPropagation(e.currentTarget);
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        L.DomEvent.stopPropagation(e);
        L.DomEvent.disableClickPropagation(e.currentTarget);
        L.DomEvent.disableTouchPropagation(e.currentTarget);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        e.preventDefault();
        L.DomEvent.stopPropagation(e);
        L.DomEvent.disableClickPropagation(e.currentTarget);
        L.DomEvent.disableTouchPropagation(e.currentTarget);
      }}
    >
      <div className="bg-white p-4 rounded-lg shadow-lg mb-2">
        <p className="text-gray-700">Click or tap to add points. Click Finish when done.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleFinishClick}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            L.DomEvent.stopPropagation(e);
            L.DomEvent.disableClickPropagation(e.currentTarget);
            L.DomEvent.disableTouchPropagation(e.currentTarget);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            e.preventDefault();
            L.DomEvent.stopPropagation(e);
            L.DomEvent.disableClickPropagation(e.currentTarget);
            L.DomEvent.disableTouchPropagation(e.currentTarget);
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow-lg"
        >
          Finish
        </button>
        <button
          onClick={handleCancel}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            L.DomEvent.stopPropagation(e);
            L.DomEvent.disableClickPropagation(e.currentTarget);
            L.DomEvent.disableTouchPropagation(e.currentTarget);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            e.preventDefault();
            L.DomEvent.stopPropagation(e);
            L.DomEvent.disableClickPropagation(e.currentTarget);
            L.DomEvent.disableTouchPropagation(e.currentTarget);
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;