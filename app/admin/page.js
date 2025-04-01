'use client';

import { useState, useEffect } from 'react';
import { database } from '../../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { ROLES, setPlayerRole } from '../../lib/firebase/roles';
import { useAuth } from '../../lib/firebase/auth-hooks';

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  useEffect(() => {
    if (!user) return;

    const currentUserRef = ref(database, `players/${user.uid}`);
    const unsubscribe = onValue(currentUserRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setCurrentUserRole(userData.role || ROLES.HIDER);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let unsubscribe;
    
    try {
      const playersRef = ref(database, 'players');
      unsubscribe = onValue(playersRef, (snapshot) => {
        if (snapshot.exists()) {
          const usersList = [];
          snapshot.forEach((childSnapshot) => {
            usersList.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            });
          });
          console.log('Fetched users:', usersList); // Debug log
          setUsers(usersList);
          setLoading(false);
        } else {
          setUsers([]);
          setLoading(false);
        }
      }, (error) => {
        console.error('Error fetching users:', error);
        setError('Failed to load users: ' + error.message);
        setLoading(false);
      });
    } catch (err) {
      console.error('Error setting up users listener:', err);
      setError('Failed to setup users listener: ' + err.message);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingUserId(userId);
      await setPlayerRole(userId, newRole);
      console.log(`Updated role for user ${userId} to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
      setError(`Failed to update role: ${error.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex justify-center items-center">
          <div className="text-xl text-black">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-red-600 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {user && currentUserRole && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Your Role</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Logged in as: {user.email || user.displayName}
                </p>
              </div>
              <div className="flex items-center">
                <span className="px-4 py-2 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                  {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-8 text-black">Admin Panel - Users ({users.length})</h1>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.displayName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={user.role || ROLES.HIDER}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updatingUserId === user.id}
                        className="block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        {Object.values(ROLES).map((role) => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {updatingUserId === user.id && (
                        <span className="text-indigo-600">Updating...</span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 