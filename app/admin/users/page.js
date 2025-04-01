'use client';

import { useState, useEffect } from 'react';
import { database } from "../../../lib/firebase"
import { ref, onValue, set } from 'firebase/database';

export default function UserManagement() {
  const [users, setUsers] = useState([]);

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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Player Role Management</h1>
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b text-left">Player</th>
              <th className="px-6 py-3 border-b text-left">Current Role</th>
              <th className="px-6 py-3 border-b text-left">Last Updated</th>
              <th className="px-6 py-3 border-b text-left">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.uid}>
                <td className="px-6 py-4 border-b">
                  <div className="flex items-center space-x-3">
                    {user.photoURL && (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || 'Player'} 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span>{user.displayName || 'Anonymous'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 border-b">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    user.role === 'seeker' ? 'bg-red-100 text-red-800' :
                    user.role === 'hider' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role || 'hider'}
                  </span>
                </td>
                <td className="px-6 py-4 border-b text-sm text-gray-500">
                  {user.roleUpdatedAt ? new Date(user.roleUpdatedAt).toLocaleString() : 'N/A'}
                </td>
                <td className="px-6 py-4 border-b">
                  <select
                    value={user.role || 'hider'}
                    onChange={(e) => updateUserRole(user.uid, e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="hider">Hider</option>
                    <option value="seeker">Seeker</option>
                    <option value="spectator">Spectator</option>
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                  No players found in the database
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 