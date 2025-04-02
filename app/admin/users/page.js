'use client';

import { useState, useEffect } from 'react';
import { database } from "../../../lib/firebase"
import { ref, onValue, set } from 'firebase/database';
import SpinningWheel from '../../../components/SpinningWheel';
import AdminPanel from '../page';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [showSpinningWheel, setShowSpinningWheel] = useState(false);

  useEffect(() => {
    console.log('Setting up realtime listener...');
    const playersRef = ref(database, 'players');
    
    // Use onValue instead of get for realtime updates
    const unsubscribe = onValue(playersRef, (snapshot) => {
      console.log('Received realtime update');
      if (snapshot.exists()) {
        const usersData = [];
        snapshot.forEach((childSnapshot) => {
          const playerData = childSnapshot.val();
          console.log('Player data:', playerData);
          usersData.push({
            uid: childSnapshot.key,
            ...playerData
          });
        });
        console.log('Final players array:', usersData);
        setUsers(usersData);
      } else {
        console.log('No players found in database');
        setUsers([]);
      }
    }, (error) => {
      console.error('Error fetching players:', error);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const updateUserRole = async (uid, newRole) => {
    try {
      const playerRef = ref(database, `players/${uid}`);
      const timestamp = Date.now();
      await set(playerRef, {
        ...users.find(u => u.uid === uid),
        role: newRole,
        roleUpdatedAt: timestamp
      });
      console.log(`Updated role for player ${uid} to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleClose = () => {
    setShowSpinningWheel(false);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <button
          onClick={() => setShowSpinningWheel(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          Избери търсещи
        </button>
      </div>
      <AdminPanel />
      {showSpinningWheel && (
        <SpinningWheel onClose={handleClose} />
      )}
    </div>
  );
} 