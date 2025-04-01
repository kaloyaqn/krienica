'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '../../lib/firebase/auth-hooks';
import Image from 'next/image';

// Import the Map component dynamically to avoid SSR issues with Leaflet
const GameMap = dynamic(() => import('../../components/GameMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 animate-pulse" />
});

export default function GamePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not loading, return null (will be redirected)
  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Car Hide & Seek</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'User avatar'}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-500">👤</span>
                </div>
              )}
              <span className="font-semibold">{user.displayName}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="h-[calc(100vh-8rem)] rounded-lg overflow-hidden shadow-lg">
          <GameMap />
        </div>
      </div>
    </main>
  );
} 