'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '../lib/firebase';
import { useAuth } from '../lib/firebase/auth-hooks';

export default function ZoneManager({ onZoneSelect }) {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [newZone, setNewZone] = useState({
    name: '',
    center: [51.505, -0.09],
    radius: 1000
  });
  const [isCreating, setIsCreating] = useState(false);

  // Load zones from database
  useEffect(() => {
    if (!user) return;

    const zonesRef = ref(database, 'zones');
    const unsubscribe = onValue(zonesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const zonesArray = Object.entries(data).map(([id, zone]) => ({
          id,
          ...zone
        }));
        setZones(zonesArray);
      } else {
        setZones([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const createZone = async () => {
    if (!user) return;

    try {
      const zonesRef = ref(database, 'zones');
      const newZoneRef = push(zonesRef);
      
      await set(newZoneRef, {
        ...newZone,
        createdBy: user.uid,
        createdAt: Date.now()
      });

      setNewZone({
        name: '',
        center: [51.505, -0.09],
        radius: 1000
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating zone:', error);
    }
  };

  const deleteZone = async (zoneId) => {
    if (!user) return;

    try {
      const zoneRef = ref(database, `zones/${zoneId}`);
      await set(zoneRef, null);
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Game Zones</h3>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isCreating ? 'Cancel' : 'Create Zone'}
        </button>
      </div>

      {isCreating && (
        <div className="mb-4 p-4 border rounded">
          <h4 className="font-medium mb-2">Create New Zone</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Zone Name"
              value={newZone.name}
              onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
              className="w-full px-2 py-1 border rounded"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Latitude"
                value={newZone.center[0]}
                onChange={(e) => setNewZone({
                  ...newZone,
                  center: [parseFloat(e.target.value), newZone.center[1]]
                })}
                className="px-2 py-1 border rounded"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={newZone.center[1]}
                onChange={(e) => setNewZone({
                  ...newZone,
                  center: [newZone.center[0], parseFloat(e.target.value)]
                })}
                className="px-2 py-1 border rounded"
              />
            </div>
            <input
              type="number"
              placeholder="Radius (meters)"
              value={newZone.radius}
              onChange={(e) => setNewZone({ ...newZone, radius: parseInt(e.target.value) })}
              className="w-full px-2 py-1 border rounded"
            />
            <button
              onClick={createZone}
              className="w-full px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Create Zone
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
          >
            <div>
              <h4 className="font-medium">{zone.name}</h4>
              <p className="text-sm text-gray-600">
                Center: [{zone.center[0]}, {zone.center[1]}]
                <br />
                Radius: {zone.radius}m
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onZoneSelect(zone)}
                className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Select
              </button>
              <button
                onClick={() => deleteZone(zone.id)}
                className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 