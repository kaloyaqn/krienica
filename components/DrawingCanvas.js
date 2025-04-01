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
  const lastTouchEndTime = useRef(0);

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

    // Disable map interactions while drawing
    map.dragging.disable();
    map.touchZoom.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();

    // Handle map clicks and touches
    const handleMapClick = (e) => {
      if (!isDrawing) return;
      
      const newPoint = e.latlng;
      setPoints(prev => [...prev, newPoint]);
    };

    // Handle mouse move and touch move
    const handleMove = (e) => {
      if (!isDrawing || points.length === 0) return;
      
      const currentPoint = e.latlng;
      setMousePosition(currentPoint);

      // Update the temporary line
      if (tempLineRef.current) {
        map.removeLayer(tempLineRef.current);
      }

      tempLineRef.current = L.polyline([
        points[points.length - 1],
        currentPoint
      ], {
        color: '#4CAF50',
        weight: 2,
        dashArray: '5, 10',
        opacity: 0.7
      }).addTo(map);
    };

    // Handle double click and double tap
    const handleFinish = () => {
      if (points.length < 3) return;
      
      // Convert points to the format expected by the parent and close the polygon
      const coordinates = [...points.map(point => [point.lat, point.lng])];
      // Add the first point again to close the polygon
      coordinates.push(coordinates[0]);
      
      // Call the callback with the coordinates
      onZoneCreated(coordinates);
      
      // Clean up
      if (tempPolygonRef.current) {
        map.removeLayer(tempPolygonRef.current);
      }
      if (tempLineRef.current) {
        map.removeLayer(tempLineRef.current);
      }
      setPoints([]);
      setMousePosition(null);
      setIsDrawing(false);
    };

    // Handle touch end for double tap detection
    const handleTouchEnd = (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTouchEndTime.current;
      
      if (tapLength < 500 && tapLength > 0) {
        handleFinish();
      }
      
      lastTouchEndTime.current = currentTime;
    };

    // Add event listeners
    map.on('click', handleMapClick);
    map.on('mousemove', handleMove);
    map.on('dblclick', handleFinish);
    map.on('touchstart', handleMapClick);
    map.on('touchmove', handleMove);
    map.on('touchend', handleTouchEnd);

    // Start drawing
    setIsDrawing(true);

    // Cleanup function
    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMove);
      map.off('dblclick', handleFinish);
      map.off('touchstart', handleMapClick);
      map.off('touchmove', handleMove);
      map.off('touchend', handleTouchEnd);
      
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
    };
  }, [map, isDrawing, points, onZoneCreated]);

  // Handle cancel button click
  const handleCancel = () => {
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

  return (
    <div 
      className="absolute top-4 right-4 z-[1000]"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        // Also prevent the event from being handled by the map
        L.DomEvent.stopPropagation(e);
        L.DomEvent.disableClickPropagation(e.currentTarget);
      }}
    >
      <div className="bg-white p-4 rounded-lg shadow-lg mb-2">
        <p className="text-gray-700">Click or tap to add points. Double-click/tap or use the Finish button to complete.</p>
      </div>
      <div className="flex gap-2">
        {points.length >= 3 && (
          <button
            onClick={() => {
              // Convert points to the format expected by the parent and close the polygon
              const coordinates = [...points.map(point => [point.lat, point.lng])];
              // Add the first point again to close the polygon
              coordinates.push(coordinates[0]);
              
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
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow-lg"
          >
            Finish
          </button>
        )}
        <button
          onClick={handleCancel}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas; 