'use server';

import { cookies } from 'next/headers';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCfQGV2WmVHtXgOz5OqOcfy_CBHs8Yq3jg",
  authDomain: "krienica.firebaseapp.com",
  databaseURL: "https://krienica-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "krienica",
  storageBucket: "krienica.firebasestorage.app",
  messagingSenderId: "1066957289933",
  appId: "1:1066957289933:web:9e08b1ca237b9683fe2c84",
  measurementId: "G-EJ9K76K1C4"
};

// Initialize Firebase Admin if it hasn't been initialized
const apps = getApps();
const firebaseAdmin = apps.length === 0 
  ? initializeApp({
      credential: cert({
        projectId: firebaseConfig.projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: firebaseConfig.databaseURL,
    })
  : apps[0];

export const adminAuth = getAuth(firebaseAdmin);
export const adminDb = getFirestore(firebaseAdmin);

export async function isUserAuthenticated() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) return null;
    
    // Verify session cookie and get user
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    return null;
  }
}

export async function createSessionCookie(idToken) {
  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const options = {
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
    };
    
    cookies().set(options);
    return sessionCookie;
  } catch (error) {
    console.error('Failed to create session cookie:', error);
    throw new Error('Unauthorized');
  }
} 