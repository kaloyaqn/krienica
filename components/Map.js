import React from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import DrawingCanvas from './DrawingCanvas';

const Map = ({ zones, onZoneCreated, onCancel, userRole }) => {
  const center = [42.6977, 23.3219]; // Sofia coordinates

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Only show zones if user is a seeker */}
      {userRole === 'seeker' && zones.map((zone, index) => (
        <Polygon
          key={index}
          positions={zone}
          color="#4CAF50"
          fillOpacity={0.2}
          weight={2}
        />
      ))}

      {/* Only show drawing canvas if user is a hider */}
      {userRole === 'hider' && (
        <DrawingCanvas
          onZoneCreated={onZoneCreated}
          onCancel={onCancel}
        />
      )}
    </MapContainer>
  );
};

export default Map; 