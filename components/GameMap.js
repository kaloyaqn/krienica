'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { useAuth } from '@/lib/firebase/auth-hooks';
import LocationSimulator from './LocationSimulator';
import { database } from '../lib/firebase';
import { ref, onValue, set, push } from 'firebase/database';
import { debounce } from 'lodash';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom marker icons
const createMarkerIcon = (photoURL, isCurrentUser = false) => {
  const size = isCurrentUser ? 40 : 30;
  const borderSize = isCurrentUser ? 3 : 2;
  const borderColor = isCurrentUser ? '#4CAF50' : '#FF0000';
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${borderColor};
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${borderSize}px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">
        ${photoURL ? `
          <img 
            src="${photoURL}" 
            style="
              width: ${size - borderSize * 2}px;
              height: ${size - borderSize * 2}px;
              border-radius: 50%;
              object-fit: cover;
            "
            onerror="this.onerror=null; this.src='https://www.gravatar.com/avatar/?d=mp';"
          />
        ` : `
          <div style="
            width: ${size - borderSize * 2}px;
            height: ${size - borderSize * 2}px;
            border-radius: 50%;
            background-color: #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${size / 2}px;
          ">
            👤
          </div>
        `}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map updater component - only update on first position
function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && !map.initialPositionSet) {
      map.setView(position, 16);
      map.initialPositionSet = true;
    }
  }, [position, map]);
  return null;
}

// Drawing control component
function DrawingControl({ onZoneCreated, onCancel }) {
  const map = useMap();
  const drawControl = useRef(null);
  const drawnItems = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    // Create a FeatureGroup to store editable layers
    drawnItems.current = new L.FeatureGroup();
    map.addLayer(drawnItems.current);

    // Create draw control
    drawControl.current = new L.Control.Draw({
      position: 'topright',
      draw: {
        circle: {
          allowIntersection: false,
          showLength: true,
          metric: true,
          feet: false,
          shapeOptions: {
            color: '#4CAF50',
            fillColor: '#4CAF50',
            fillOpacity: 0.2,
            weight: 3
          }
        },
        circlemarker: false,
        marker: false,
        polyline: false,
        polygon: false,
        rectangle: false
      },
      edit: {
        featureGroup: drawnItems.current,
        remove: true
      }
    });

    // Add draw control to map
    map.addControl(drawControl.current);

    // Handle circle creation
    map.on('draw:created', (e) => {
      if (isDrawing.current) return; // Prevent multiple creations
      isDrawing.current = true;
      
      const layer = e.layer;
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      
      // Prompt for zone name
      const name = prompt('Enter zone name:');
      if (name) {
        onZoneCreated({
          name,
          center: [center.lat, center.lng],
          radius: radius
        });
      }
      isDrawing.current = false;
    });

    // Handle drawing start
    map.on('draw:drawstart', () => {
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
    });

    // Handle drawing stop
    map.on('draw:drawstop', () => {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
    });

    return () => {
      if (drawControl.current) {
        map.removeControl(drawControl.current);
      }
      if (drawnItems.current) {
        map.removeLayer(drawnItems.current);
      }
      // Re-enable map interactions
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
    };
  }, [map, onZoneCreated]);

  return null;
}

export default function GameMap() {
  const { user } = useAuth();
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [useSimulator, setUseSimulator] = useState(false);
  const [players, setPlayers] = useState({});
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifiedPlayers = useRef(new Map());
  const lastStatusUpdate = useRef(null);
  const mapRef = useRef(null);
  const locationWatchId = useRef(null);

  // Add notification function with cooldown
  const addNotification = (playerId, message) => {
    const now = Date.now();
    const lastNotified = notifiedPlayers.current.get(playerId) || 0;
    const cooldownPeriod = 30000; // 30 seconds cooldown

    // Check if we're still in cooldown for this player
    if (now - lastNotified < cooldownPeriod) {
      return;
    }

    // Update last notified time for this player
    notifiedPlayers.current.set(playerId, now);

    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Debounced update location function
  const updateLocation = useCallback(
    debounce(async (locationData) => {
      if (!user) return;
      try {
        const currentPlayer = players[user.uid] || {};
        const playerData = {
          ...currentPlayer,
          position: locationData,
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL || null,
          timestamp: Date.now()
        };
        
        const userLocationRef = ref(database, `players/${user.uid}`);
        await set(userLocationRef, playerData);
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }, 1000), // Update at most once per second
    [user, players]
  );

  // Get initial position and watch for changes with auto-reconnect
  useEffect(() => {
    if (!user || useSimulator) return;

    let watchId = null;
    let reconnectTimeout = null;
    const RECONNECT_DELAY = 2000; // 2 seconds

    const startWatching = () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          updateLocation(newPos);
          setError(null);
          setIsLocating(false);
        },
        (err) => {
          console.error('Location watch error:', err);
          // Only set error if it's a permission issue
          if (err.code === 1) { // PERMISSION_DENIED
            setError('Please enable location services to use this app');
            setIsLocating(false);
          } else {
            // For other errors, try to reconnect
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(startWatching, RECONNECT_DELAY);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        }
      );

      // Get initial position immediately
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          updateLocation(newPos);
          setError(null);
          setIsLocating(false);
        },
        (err) => {
          console.error('Initial position error:', err);
          if (err.code === 1) { // PERMISSION_DENIED
            setError('Please enable location services to use this app');
          }
          setIsLocating(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // Start watching immediately
    startWatching();

    // Set up an interval to check if we're still getting updates
    const checkInterval = setInterval(() => {
      if (!position) {
        console.log('No position updates, restarting watch...');
        startWatching();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(checkInterval);
    };
  }, [user, useSimulator, updateLocation]);

  // Check if player is outside any zone and update status - with rate limiting
  useEffect(() => {
    if (!position || !user || zones.length === 0) return;

    const now = Date.now();
    if (lastStatusUpdate.current && now - lastStatusUpdate.current < 5000) {
      return;
    }
    lastStatusUpdate.current = now;

    const isInAnyZone = zones.some(zone => {
      const distance = L.latLng(position).distanceTo(L.latLng(zone.center));
      return distance <= zone.radius;
    });

    // Update player's status in the database
    const playerRef = ref(database, `players/${user.uid}`);
    const currentPlayer = players[user.uid] || {};
    const timestamp = Date.now();
    
    set(playerRef, {
      ...currentPlayer,
      position,
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || null,
      timestamp: timestamp,
      isOutsideZone: !isInAnyZone,
      lastOutsideAlert: !isInAnyZone ? timestamp : (currentPlayer.lastOutsideAlert || timestamp)
    });
  }, [position, zones, user, players]);

  // Listen to other players' positions
  useEffect(() => {
    if (!user) return;

    const playersRef = ref(database, 'players');
    const currentNotifiedPlayers = notifiedPlayers.current;
    
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        const validPlayers = Object.entries(data).reduce((acc, [id, player]) => {
          if (player && player.position && Array.isArray(player.position)) {
            // Check if player is outside zone and it's not the current user
            if (player.isOutsideZone && id !== user.uid) {
              addNotification(id, `⚠️ ${player.displayName || 'A player'} is outside the game zones!`);
            }
            acc[id] = player;
          }
          return acc;
        }, {});
        
        setPlayers(validPlayers);
      } else {
        setPlayers({});
      }
    });

    return () => {
      unsubscribe();
      currentNotifiedPlayers.clear();
    };
  }, [user]);

  const handleSimulatedLocation = (newPos) => {
    console.log('Simulated location update:', newPos);
    setPosition(newPos);
    updateLocation(newPos);
  };

  const handleZoneCreated = async (zoneData) => {
    if (!user) return;

    try {
      const zonesRef = ref(database, 'zones');
      const newZoneRef = push(zonesRef);
      
      await set(newZoneRef, {
        ...zoneData,
        createdBy: user.uid,
        createdAt: Date.now()
      });
    } catch (error) {
      console.error('Error creating zone:', error);
    }
  };

  // Add handleDeleteZone function here
  const handleDeleteZone = async (zoneId) => {
    if (!user) return;
    
    try {
      const zoneRef = ref(database, `zones/${zoneId}`);
      await set(zoneRef, null);
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

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

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3">Loading...</span>
      </div>
    );
  }

  if (error && !useSimulator) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <p className="text-sm mb-4">
          Please make sure:
          <br />- Location services are enabled in your device settings
          <br />- You&apos;ve given permission to access location in your browser
          <br />- You&apos;re using a secure (HTTPS) connection
          <br />- You&apos;re not in private/incognito mode
        </p>
        <button
          onClick={() => {
            setError(null);
            setIsLocating(true);
            window.location.reload();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
        >
          Try Again
        </button>
        <button
          onClick={() => setUseSimulator(true)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Use Location Simulator
        </button>
      </div>
    );
  }

  if (isLocating && !useSimulator) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-black">Getting your location...</p>
        <p className="text-sm text-gray-500 mt-2">Please allow location access when prompted</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-3/4 h-[500px] md:h-full relative">
        {position ? (
          <>
            <MapContainer
              center={position}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <MapUpdater position={position} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Game zones */}
              {zones.map((zone) => (
                <Circle
                  key={zone.id}
                  center={zone.center}
                  radius={zone.radius}
                  pathOptions={{
                    color: selectedZone?.id === zone.id ? '#4CAF50' : 'blue',
                    fillColor: selectedZone?.id === zone.id ? '#4CAF50' : 'blue',
                    fillOpacity: selectedZone?.id === zone.id ? 0.2 : 0.1,
                    weight: selectedZone?.id === zone.id ? 3 : 2
                  }}
                >
                  <Popup>
                    <span className="text-black font-bold">{zone.name}</span>
                    <br />
                    <span className="text-black">Radius: {Math.round(zone.radius)}m</span>
                  </Popup>
                </Circle>
              ))}

              {/* Current player marker */}
              <Marker
                position={position}
                icon={createMarkerIcon(user.photoURL, true)}
              >
                <Popup>
                  <span className="text-black">You ({user.displayName})</span>
                  <br />
                  <span className="text-black">Current Location</span>
                </Popup>
              </Marker>

              {/* Other players markers */}
              {Object.entries(players).map(([playerId, playerData]) => {
                if (playerId === user.uid) return null;
                return (
                  <Marker
                    key={playerId}
                    position={playerData.position}
                    icon={createMarkerIcon(playerData.photoURL)}
                  >
                    <Popup>
                      <span className="text-black">{playerData.displayName}</span>
                      <br />
                      <span className="text-black">Last updated: {new Date(playerData.timestamp).toLocaleTimeString()}</span>
                      {playerData.isOutsideZone && (
                        <div className="mt-2 text-red-500 font-bold">
                          ⚠️ Outside Game Zone
                        </div>
                      )}
                    </Popup>
                  </Marker>
                );
              })}

              {/* Drawing control */}
              {isDrawingEnabled && (
                <DrawingControl
                  onZoneCreated={(zoneData) => {
                    handleZoneCreated(zoneData);
                    setIsDrawingEnabled(false);
                  }}
                  onCancel={() => setIsDrawingEnabled(false)}
                />
              )}
            </MapContainer>
            {!isDrawingEnabled && (
              <button
                onClick={() => setIsDrawingEnabled(true)}
                className="absolute bottom-4 left-4 z-[1000] px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 flex items-center gap-2 text-black"
              >
                <span>Draw Zone</span>
                <span className="text-green-500">⭕</span>
              </button>
            )}
            {isDrawingEnabled && (
              <button
                onClick={() => setIsDrawingEnabled(false)}
                className="absolute bottom-4 left-4 z-[1000] px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 flex items-center gap-2 text-black"
              >
                <span>Cancel Drawing</span>
                <span className="text-red-500">✕</span>
              </button>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-black">Getting your location...</span>
          </div>
        )}
      </div>
      
      <div className="w-full md:w-1/4 space-y-4">
        {/* Zone Management Panel */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-black">Game Zones</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {zones.length === 0 ? (
              <p className="text-gray-500 text-sm">No zones created yet</p>
            ) : (
              zones.map((zone) => (
                <div 
                  key={zone.id}
                  className={`p-3 rounded-lg border ${
                    selectedZone?.id === zone.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-black">{zone.name}</h3>
                      <p className="text-sm text-gray-600">
                        Radius: {Math.round(zone.radius)}m
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(zone.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteZone(zone.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete zone"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Location Simulator */}
        {useSimulator && (
          <LocationSimulator onLocationUpdate={handleSimulatedLocation} />
        )}
      </div>

      {/* Debug info */}
      <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg text-xs text-black">
        <p>Your ID: {user.uid}</p>
        <p>Position: {position ? `[${position[0]}, ${position[1]}]` : 'None'}</p>
        <p>Other players: {Object.keys(players).length - 1}</p>
        <p>Active zones: {zones.length}</p>
        <button 
          onClick={() => setUseSimulator(true)}
          className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Show Simulator
        </button>
      </div>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-[2000] space-y-2 min-w-[300px]">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg"
            role="alert"
          >
            <div className="flex justify-between items-start">
              <p className="font-bold">{notification.message}</p>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="ml-4 text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 