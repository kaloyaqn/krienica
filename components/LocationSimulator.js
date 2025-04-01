'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-hooks';

export default function LocationSimulator({ onLocationUpdate }) {
  const { user } = useAuth();
  const [latitude, setLatitude] = useState('51.505');
  const [longitude, setLongitude] = useState('-0.09');

  const handleSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid numbers for latitude and longitude');
      return;
    }
    
    onLocationUpdate([lat, lng]);
  };

  const moveLocation = (direction) => {
    const step = 0.0001; // Approximately 11 meters at the equator
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid numbers for latitude and longitude');
      return;
    }

    let newLat = lat;
    let newLng = lng;

    switch (direction) {
      case 'north':
        newLat += step;
        break;
      case 'south':
        newLat -= step;
        break;
      case 'east':
        newLng += step;
        break;
      case 'west':
        newLng -= step;
        break;
    }

    setLatitude(newLat.toString());
    setLongitude(newLng.toString());
    onLocationUpdate([newLat, newLng]);
  };

  if (!user) return null;

  return (
    <div className="p-4 bg-white rounded-lg shadow space-y-4">
      <h3 className="text-lg font-semibold">Location Simulator</h3>
      
      {/* Arrow Controls */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div />
        <button
          onClick={() => moveLocation('north')}
          className="p-2 bg-blue-100 rounded hover:bg-blue-200 flex items-center justify-center"
          title="Move North"
        >
          ↑
        </button>
        <div />
        
        <button
          onClick={() => moveLocation('west')}
          className="p-2 bg-blue-100 rounded hover:bg-blue-200 flex items-center justify-center"
          title="Move West"
        >
          ←
        </button>
        <div className="p-2 bg-gray-100 rounded text-center text-sm">
          Move
        </div>
        <button
          onClick={() => moveLocation('east')}
          className="p-2 bg-blue-100 rounded hover:bg-blue-200 flex items-center justify-center"
          title="Move East"
        >
          →
        </button>
        
        <div />
        <button
          onClick={() => moveLocation('south')}
          className="p-2 bg-blue-100 rounded hover:bg-blue-200 flex items-center justify-center"
          title="Move South"
        >
          ↓
        </button>
        <div />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
            Latitude
          </label>
          <input
            type="number"
            id="latitude"
            step="0.0001"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
            Longitude
          </label>
          <input
            type="number"
            id="longitude"
            step="0.0001"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Set Location
        </button>
      </form>

      <div className="text-xs text-gray-500 mt-2">
        <p>Tip: Use arrow buttons to move in small increments</p>
        <p>Each click moves approximately 11 meters</p>
      </div>
    </div>
  );
} 