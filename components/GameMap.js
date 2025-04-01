'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { useAuth } from '../lib/firebase/auth-hooks';
import LocationSimulator from './LocationSimulator';
import { database, auth } from '../lib/firebase';
import { ref, onValue, set, push } from 'firebase/database';
import { debounce } from 'lodash';
import dynamic from 'next/dynamic';
import { signOut } from 'firebase/auth';

// Dynamically import DrawingCanvas to avoid SSR issues
const DrawingCanvas = dynamic(() => import('./DrawingCanvas'), {
  ssr: false
});

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

// Add Safari detection
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome');
};

// Profile Component
function ProfileOverlay({ user, position, useSimulator, setUseSimulator }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  
  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="fixed top-4 left-4 z-[1000]" ref={menuRef}>
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg p-2 pr-4 hover:bg-white/100 transition-all"
      >
        <img 
          src={user.photoURL || '/default-avatar.png'} 
          alt={user.displayName}
          className="w-8 h-8 rounded-full border-2 border-white"
        />
        <span className="font-medium text-gray-800">{user.displayName}</span>
      </button>

      {/* Profile Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2">
          <div className="p-2 text-sm text-gray-600 border-b border-gray-200">
            <div>ID: {user.uid.slice(0, 8)}...</div>
            <div>Позиция: {position ? `[${position[0].toFixed(4)}, ${position[1].toFixed(4)}]` : 'Няма'}</div>
          </div>
          <button 
            onClick={() => setUseSimulator(!useSimulator)}
            className="w-full text-left p-2 hover:bg-white/80 rounded text-sm text-gray-700"
          >
            {useSimulator ? 'Използвай GPS' : 'Използвай симулатор'}
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="w-full text-left p-2 hover:bg-white/80 rounded text-sm text-red-600"
          >
            Изход
          </button>
        </div>
      )}
    </div>
  );
}

// Game Info Modal
function GameInfoModal({ isOpen, onClose, zones, players, user, onDeleteZone }) {
  const modalRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1500] flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Информация за играта</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)] space-y-6">
          {/* Zones Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Игрални зони</h3>
            <div className="space-y-2">
              {zones.length === 0 ? (
                <p className="text-gray-500">Няма създадени зони</p>
              ) : (
                zones.map((zone) => (
                  <div 
                    key={zone.id}
                    className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-800">{zone.name}</h4>
                        <p className="text-sm text-gray-600">
                          Радиус: {Math.round(zone.radius)}м
                        </p>
                        <p className="text-xs text-gray-500">
                          Създадена: {new Date(zone.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteZone(zone.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Изтрий зона"
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

          {/* Players Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Играчи</h3>
            <div className="space-y-2">
              {Object.entries(players).map(([playerId, playerData]) => (
                <div 
                  key={playerId}
                  className={`p-3 rounded-lg border ${
                    playerData.isOutsideZone 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={playerData.photoURL || '/default-avatar.png'} 
                      alt={playerData.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        {playerData.displayName}
                        {playerId === user.uid && ' (Вие)'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Последно обновяване: {new Date(playerData.timestamp).toLocaleTimeString()}
                      </div>
                      {playerData.isOutsideZone && (
                        <div className="text-sm text-red-600 font-medium mt-1">
                          ⚠️ Извън игралната зона
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Zone Creation Modal
function ZoneCreationModal({ isOpen, onClose, onSubmit }) {
  const [zoneName, setZoneName] = useState('');
  const modalRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (zoneName.trim()) {
      onSubmit(zoneName.trim());
      setZoneName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Създаване на нова зона</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="zoneName" className="block text-sm font-medium text-gray-700 mb-1">
              Име на зоната
            </label>
            <input
              type="text"
              id="zoneName"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              className="w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Въведете име на зоната"
              autoFocus
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Отказ
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Създай зона
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add key to force remount when position changes
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
  const watchIdRef = useRef(null);
  const timeoutRef = useRef(null);
  const [isGameInfoOpen, setIsGameInfoOpen] = useState(false);
  const [isZoneCreationModalOpen, setIsZoneCreationModalOpen] = useState(false);
  const [pendingZoneData, setPendingZoneData] = useState(null);

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

  // Function to request location permission explicitly
  const requestLocationPermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === 'prompt' || result.state === 'denied') {
        // For Safari, we need to call getCurrentPosition to trigger the permission prompt
        navigator.geolocation.getCurrentPosition(
          () => {
            // Permission granted, start watching
            startLocationWatch();
          },
          (err) => {
            console.error('Permission error:', err);
            handleLocationError(err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else if (result.state === 'granted') {
        startLocationWatch();
      }
    } catch (err) {
      // Safari might not support permissions API, fallback to direct getCurrentPosition
      if (isSafari()) {
        navigator.geolocation.getCurrentPosition(
          () => {
            // Permission granted, start watching
            startLocationWatch();
          },
          (err) => {
            console.error('Safari permission error:', err);
            handleLocationError(err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }
  }, []);

  // Function to start location watching
  const startLocationWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Вашият браузър не поддържа определяне на местоположение');
      setIsLocating(false);
      return;
    }

    setIsLocating(true);

    // Clear existing watch
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const handleSuccess = (pos) => {
      const coords = pos?.coords;
      if (!coords?.latitude || !coords?.longitude) {
        handleLocationError({ code: 2, message: 'Invalid coordinates received' });
        return;
      }

      const newPos = [coords.latitude, coords.longitude];
      setPosition(newPos);
      updateLocation(newPos);
      setError(null);
      setIsLocating(false);
      
      // Reset timeout values on successful position
      timeoutRef.current = BASE_TIMEOUT;
      
      // Log successful position update
      console.log('Position updated:', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: new Date().toISOString()
      });
    };

    const handleError = (err) => {
      // Handle empty error object
      if (!err || Object.keys(err).length === 0) {
        handleLocationError({
          code: 2,
          message: 'Empty error object received from geolocation API'
        });
        return;
      }

      handleLocationError(err);

      // Progressive timeout strategy for timeout errors
      if (err.code === 3) { // Timeout error
        timeoutRef.current = Math.min(timeoutRef.current * 1.5, MAX_TIMEOUT);
        console.log('Increasing timeout to:', timeoutRef.current);
        
        // Immediate retry with new timeout
        setTimeout(() => {
          if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          startLocationWatch();
        }, 1000);
        return;
      }

      // Try to restart watching if we lose position (but not for permission denied)
      if (err.code !== 1) {
        setTimeout(() => {
          if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          startLocationWatch();
        }, 5000);
      }
    };

    // Base timeout values
    const BASE_TIMEOUT = isSafari() ? 10000 : 5000;
    const MAX_TIMEOUT = 30000;
    timeoutRef.current = BASE_TIMEOUT;

    const options = {
      enableHighAccuracy: true,
      timeout: timeoutRef.current,
      maximumAge: 0 // Don't use cached positions
    };

    try {
      // Get initial position with shorter timeout
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        {
          ...options,
          timeout: BASE_TIMEOUT // Use base timeout for initial position
        }
      );

      // Start watching position with current timeout value
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        options
      );

      // Set up a periodic check to ensure watch is still active
      const checkInterval = setInterval(() => {
        if (!watchIdRef.current) {
          clearInterval(checkInterval);
          startLocationWatch();
        }
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    } catch (e) {
      console.error('Error setting up geolocation:', e);
      handleLocationError({
        code: 2,
        message: 'Failed to initialize geolocation'
      });
    }
  }, [updateLocation, position]);

  // Handle location errors with more specific timeout messaging
  const handleLocationError = (error) => {
    let errorMessage = 'Неизвестна грешка при определяне на местоположението';
    
    if (error) {
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Достъпът до местоположението е отказан. Моля, разрешете достъп в настройките на браузъра.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'В момента местоположението е недостъпно. Моля, проверете GPS връзката.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Времето за определяне на местоположението изтече. Опитваме отново с по-дълго изчакване...';
          break;
      }
    }
    
    // Only show error message for non-timeout errors or if we don't have a position yet
    if (error?.code !== 3 || !position) {
      setError(errorMessage);
    }
    
    // Only update isLocating for non-timeout errors
    if (error?.code !== 3) {
      setIsLocating(false);
    }
    
    // Log detailed error information
    console.error('Location Error:', {
      code: error?.code,
      message: error?.message,
      errorMessage,
      timestamp: new Date().toISOString(),
      hasPosition: !!position
    });
  };

  // Initialize location tracking
  useEffect(() => {
    if (!user || useSimulator) return;

    requestLocationPermission();

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [user, useSimulator, requestLocationPermission]);

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
    setPendingZoneData(zoneData);
    setIsZoneCreationModalOpen(true);
  };

  const handleZoneSubmit = async (zoneName) => {
    if (!user || !pendingZoneData) return;

    try {
      const zonesRef = ref(database, 'zones');
      const newZoneRef = push(zonesRef);
      
      await set(newZoneRef, {
        ...pendingZoneData,
        name: zoneName,
        createdBy: user.uid,
        createdAt: Date.now()
      });
      
      setPendingZoneData(null);
      setIsDrawingEnabled(false);
    } catch (error) {
      console.error('Error creating zone:', error);
      alert('Грешка при създаване на зоната. Моля, опитайте отново.');
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

  // Add map instance cleanup
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3">Loading...</span>
      </div>
    );
  }

  if (error && !useSimulator) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50 p-4">
        <p className="text-red-500 mb-4">{error}</p>
        <p className="text-sm mb-4">
          {isSafari() ? (
            <>
              За потребители на Safari:
              <br />1. Отидете в Настройки {'->'} Safari
              <br />2. Превъртете до Поверителност и Сигурност
              <br />3. Активирайте Услуги за местоположение
              <br />4. Разрешете достъп за този сайт
              <br />5. Презаредете страницата
            </>
          ) : (
            <>
              Моля, проверете:
              <br />- Дали услугите за местоположение са активирани
              <br />- Дали сте разрешили достъп до местоположението
              <br />- Дали използвате защитена връзка (HTTPS)
              <br />- Дали не сте в режим инкогнито
            </>
          )}
        </p>
        <button
          onClick={() => {
            setError(null);
            setIsLocating(true);
            requestLocationPermission();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
        >
          Опитай отново
        </button>
        <button
          onClick={() => setUseSimulator(true)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Използвай симулатор
        </button>
      </div>
    );
  }

  if (isLocating && !useSimulator) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-black">Определяне на местоположението...</p>
        <p className="text-sm text-gray-500 mt-2">Моля, разрешете достъп до местоположението</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Map as background - always full viewport */}
      <div className="absolute inset-0 z-0">
        {position ? (
          <MapContainer
            key="map-container"
            center={position}
            zoom={15}
            style={{ height: '100vh', width: '100vw' }}
            ref={mapRef}
            zoomControl={false}
            className="h-screen w-screen"
            rotate={true}
          >
            <MapUpdater position={position} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Add zoom control in a better position */}
            <div className="leaflet-control-container">
              <div className="leaflet-top leaflet-left">
                <div className="leaflet-control-zoom leaflet-bar leaflet-control">
                  <a className="leaflet-control-zoom-in" href="#" title="Zoom in" role="button" aria-label="Zoom in">+</a>
                  <a className="leaflet-control-zoom-out" href="#" title="Zoom out" role="button" aria-label="Zoom out">−</a>
                </div>
              </div>
            </div>

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
                <span className="text-black">Ти ({user.displayName})</span>
                <br />
                <span className="text-black">Локация вмомента</span>
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
                        ⚠️ Outside Game Zo
                      </div>
                    )}
                  </Popup>
                </Marker>
              );
            })}

            {/* Drawing control */}
            {isDrawingEnabled && (
              <DrawingCanvas
                map={mapRef.current}
                onZoneCreated={(zoneData) => {
                  handleZoneCreated(zoneData);
                  setIsDrawingEnabled(false);
                }}
                onCancel={() => setIsDrawingEnabled(false)}
              />
            )}
          </MapContainer>
        ) : (
          <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-black">Определяне на местоположението...</span>
          </div>
        )}
      </div>

      {/* Profile Overlay with required props */}
      <ProfileOverlay 
        user={user} 
        position={position} 
        useSimulator={useSimulator}
        setUseSimulator={setUseSimulator}
      />

      {/* Game Info Button */}
      <button
        onClick={() => setIsGameInfoOpen(true)}
        className="fixed top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-full shadow-lg p-3 hover:bg-white/100 transition-all text-black"
        title="Информация за играта"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Game Info Modal */}
      <GameInfoModal
        isOpen={isGameInfoOpen}
        onClose={() => setIsGameInfoOpen(false)}
        zones={zones}
        players={players}
        user={user}
        onDeleteZone={handleDeleteZone}
      />

      {/* Draw Zone Button - fixed at bottom */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[1000]">
        {!isDrawingEnabled ? (
          <button
            onClick={() => setIsDrawingEnabled(true)}
            className="px-6 py-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 flex items-center gap-2 transition-all"
          >
            <span>Начертай зона</span>
            <span>⭕</span>
          </button>
        ) : (
          <button
            onClick={() => setIsDrawingEnabled(false)}
            className="px-6 py-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 flex items-center gap-2 transition-all"
          >
            <span>Отказ</span>
            <span>✕</span>
          </button>
        )}
      </div>

      {/* Notifications - fixed at top left */}
      <div className="fixed top-16 left-4 z-[2000] space-y-2 w-[90vw] max-w-[300px]">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-red-100/90 backdrop-blur-sm border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg"
            role="alert"
          >
            <div className="flex justify-between items-start">
              <p className="font-bold text-sm">{notification.message.replace('is outside the game zones', 'е извън игралните зони')}</p>
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

      {/* Zone Creation Modal */}
      <ZoneCreationModal
        isOpen={isZoneCreationModalOpen}
        onClose={() => {
          setIsZoneCreationModalOpen(false);
          setPendingZoneData(null);
        }}
        onSubmit={handleZoneSubmit}
      />
    </div>
  );
} 