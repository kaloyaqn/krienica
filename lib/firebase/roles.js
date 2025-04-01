'use client';

import { database } from '../firebase';
import { ref, get, set } from 'firebase/database';

// Game roles
export const ROLES = {
  HIDER: 'hider',
  SEEKER: 'seeker',
  SPECTATOR: 'spectator'  // Optional role for players who are out or watching
};

// Get player's role
export async function getPlayerRole(uid) {
  try {
    const playerRef = ref(database, `players/${uid}`);
    const snapshot = await get(playerRef);
    return snapshot.exists() ? snapshot.val()?.role || ROLES.HIDER : ROLES.HIDER;
  } catch (error) {
    console.error('Error getting player role:', error);
    return ROLES.HIDER;
  }
}

// Set player's role
export async function setPlayerRole(uid, role) {
  try {
    if (!Object.values(ROLES).includes(role)) {
      throw new Error('Invalid role');
    }

    const playerRef = ref(database, `players/${uid}`);
    const snapshot = await get(playerRef);
    const currentData = snapshot.exists() ? snapshot.val() : {};
    
    await set(playerRef, {
      ...currentData,
      role: role,
      roleUpdatedAt: Date.now()
    });

    return true;
  } catch (error) {
    console.error('Error setting player role:', error);
    throw error;
  }
}

// Switch player's role (e.g., from HIDER to SEEKER)
export async function switchPlayerRole(uid) {
  try {
    const currentRole = await getPlayerRole(uid);
    let newRole;

    switch (currentRole) {
      case ROLES.HIDER:
        newRole = ROLES.SEEKER;
        break;
      case ROLES.SEEKER:
        newRole = ROLES.HIDER;
        break;
      default:
        newRole = ROLES.HIDER; // Default to HIDER if no role or SPECTATOR
    }

    const playerRef = ref(database, `players/${uid}`);
    const snapshot = await get(playerRef);
    const currentData = snapshot.exists() ? snapshot.val() : {};

    await set(playerRef, {
      ...currentData,
      role: newRole,
      roleUpdatedAt: Date.now()
    });

    return newRole;
  } catch (error) {
    console.error('Error switching player role:', error);
    throw error;
  }
}

// Get all players by role
export async function getPlayersByRole(role) {
  try {
    if (!Object.values(ROLES).includes(role)) {
      throw new Error('Invalid role');
    }

    const playersSnapshot = await adminDb.collection('players')
      .where('role', '==', role)
      .get();

    return playersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting players by role:', error);
    throw error;
  }
} 