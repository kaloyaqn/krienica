'use client'

import React, { useState, useRef, useEffect } from 'react';
import { database } from '../lib/firebase';
import { ref, get, update } from 'firebase/database';
import { ROLES } from '../lib/firebase/roles';

const SpinningWheel = ({ onClose }) => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [seekerCount, setSeekerCount] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [selectedSeekers, setSelectedSeekers] = useState([]);
  const wheelRef = useRef(null);
  const [isSpinComplete, setIsSpinComplete] = useState(false);

  // Fetch all players
  useEffect(() => {
    const fetchPlayers = async () => {
      const playersRef = ref(database, 'players');
      const snapshot = await get(playersRef);
      if (snapshot.exists()) {
        const playersData = snapshot.val();
        const playersList = Object.entries(playersData).map(([id, data]) => ({
          id,
          displayName: data.displayName || 'Unknown Player',
          photoURL: data.photoURL
        }));
        setPlayers(playersList);
      }
    };
    fetchPlayers();
  }, []);

  const togglePlayerSelection = (playerId) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      return [...prev, playerId];
    });
  };

  const spinWheel = () => {
    if (selectedPlayers.length === 0 || spinning) return;
    setSpinning(true);
    setSelectedSeekers([]);
    setIsSpinComplete(false);

    // Calculate random spins for each seeker
    const seekers = [];
    const availablePlayers = [...selectedPlayers];

    for (let i = 0; i < Math.min(seekerCount, availablePlayers.length); i++) {
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      seekers.push(availablePlayers[randomIndex]);
      availablePlayers.splice(randomIndex, 1);
    }

    // Animate the wheel
    let currentRotation = 0;
    const totalSpins = 5; // Number of full spins before stopping
    const finalRotation = totalSpins * 360 + (360 / selectedPlayers.length) * Math.random();
    const duration = 5000; // 5 seconds
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth deceleration
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOut(progress);
      
      currentRotation = easedProgress * finalRotation;
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentRotation}deg)`;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setSelectedSeekers(seekers);
        setIsSpinComplete(true);
      }
    };

    requestAnimationFrame(animate);
  };

  const assignRoles = async () => {
    if (!isSpinComplete) return;

    const updates = {};
    // Set selected players as seekers
    selectedSeekers.forEach(playerId => {
      updates[`players/${playerId}/role`] = ROLES.SEEKER;
    });

    // Set remaining selected players as hiders
    selectedPlayers.forEach(playerId => {
      if (!selectedSeekers.includes(playerId)) {
        updates[`players/${playerId}/role`] = ROLES.HIDER;
      }
    });

    // Update all roles at once
    await update(ref(database), updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 text-black bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Избери играчи за колелото</h2>
        
        {/* Seeker count input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Брой търсещи:
            <input
              type="number"
              min="1"
              max={selectedPlayers.length}
              value={seekerCount}
              onChange={(e) => setSeekerCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, selectedPlayers.length)))}
              className="ml-2 p-1 border rounded"
            />
          </label>
        </div>

        {/* Player selection */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {players.map(player => (
            <div
              key={player.id}
              onClick={() => togglePlayerSelection(player.id)}
              className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 ${
                selectedPlayers.includes(player.id) ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'
              }`}
            >
              {player.photoURL && (
                <img src={player.photoURL} alt="" className="w-8 h-8 rounded-full" />
              )}
              <span>{player.displayName}</span>
            </div>
          ))}
        </div>

        {/* Spinning wheel */}
        <div className="relative w-64 h-64 mx-auto mb-6">
          <div
            ref={wheelRef}
            className="absolute inset-0 rounded-full border-4 border-gray-300"
            style={{ transition: 'transform 5s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {selectedPlayers.map((playerId, index) => {
              const player = players.find(p => p.id === playerId);
              const rotation = (360 / selectedPlayers.length) * index;
              return (
                <div
                  key={playerId}
                  className="absolute w-full h-full flex items-center justify-center"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 origin-left">
                    {player?.photoURL ? (
                      <img src={player.photoURL} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <span>{player?.displayName}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Center point */}
          <div className="absolute top-1/2 left-0 w-4 h-4 -mt-2 bg-red-500 transform -translate-y-1/2 rounded-full z-10"></div>
        </div>

        {/* Selected seekers display */}
        {selectedSeekers.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold mb-2">Избрани търсещи:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedSeekers.map(seekerId => {
                const player = players.find(p => p.id === seekerId);
                return (
                  <div key={seekerId} className="flex items-center gap-2 bg-red-100 p-2 rounded">
                    {player?.photoURL && (
                      <img src={player.photoURL} alt="" className="w-6 h-6 rounded-full" />
                    )}
                    <span>{player?.displayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Отказ
          </button>
          {!isSpinComplete ? (
            <button
              onClick={spinWheel}
              disabled={selectedPlayers.length === 0 || spinning}
              className={`px-4 py-2 rounded ${
                selectedPlayers.length === 0 || spinning
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {spinning ? 'Завърта...' : 'Завърти'}
            </button>
          ) : (
            <button
              onClick={assignRoles}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Задай роли
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpinningWheel; 