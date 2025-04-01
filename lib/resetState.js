'use client';

import { auth, database } from './firebase';
import { signOut } from 'firebase/auth';
import { ref, remove } from 'firebase/database';

export async function forceReset() {
    try {
        // 1. Sign out from Firebase
        await signOut(auth);

        // 2. Clear all localStorage
        localStorage.clear();
        
        // 3. Clear all sessionStorage
        sessionStorage.clear();

        // 4. Clear IndexedDB Firebase data
        const databases = await window.indexedDB.databases();
        await Promise.all(
            databases
                .filter(({ name }) => name.includes('firebase'))
                .map(({ name }) => 
                    new Promise((resolve, reject) => {
                        const request = window.indexedDB.deleteDatabase(name);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject();
                    })
                )
        );

        // 5. Clear service workers if any
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(r => r.unregister()));
        }

        // 6. Clear application cache if available
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        // 7. Reload the page
        window.location.href = '/';
        
    } catch (error) {
        console.error('Error during force reset:', error);
        // If all else fails, do a hard reload
        window.location.reload(true);
    }
} 