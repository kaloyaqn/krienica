'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Import the Map component dynamically to avoid SSR issues with Leaflet
const GameMap = dynamic(() => import('../components/GameMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 animate-pulse" />
});

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  const handleJoinGame = () => {
    if (playerName.trim()) {
      setIsJoined(true);
    }
  };

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-center">Car Hide & Seek</h1>
        
        {!isJoined ? (
          <div className="flex flex-col items-center space-y-4 p-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="px-4 py-2 border rounded-lg"
            />
            <button
              onClick={handleJoinGame}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Join Game
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold">Welcome, {playerName}!</h2>
              <p className="text-gray-600">Stay within the game zone!</p>
            </div>
            <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
              <GameMap playerName={playerName} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
