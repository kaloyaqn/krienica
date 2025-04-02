import React from 'react';
import { useAuth } from '../lib/firebase/auth-hooks';
import { ROLES } from '../lib/firebase/roles';

export default function AdminPanel({ users, onRoleChange }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.uid} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center space-x-2">
              <img
                src={user.photoURL || '/default-avatar.png'}
                alt={user.displayName}
                className="w-8 h-8 rounded-full"
              />
              <span>{user.displayName}</span>
            </div>
            <select
              value={user.role || ROLES.HIDER}
              onChange={(e) => onRoleChange(user.uid, e.target.value)}
              className="px-2 py-1 border rounded"
            >
              <option value={ROLES.HIDER}>Hider</option>
              <option value={ROLES.SEEKER}>Seeker</option>
              <option value={ROLES.SPECTATOR}>Spectator</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
} 