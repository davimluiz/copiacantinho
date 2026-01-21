
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Firebase Configuration
 * Note: These variables must be set in the Vercel Project Settings as Environment Variables.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Singleton pattern for Firebase App and Firestore initialization
function initialize() {
  if (typeof window === 'undefined') return null;

  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    // No Analytics, No Auth - Just Firestore
    const db = getFirestore(app);
    
    console.log('[Firebase] Sistema inicializado com sucesso.');
    return db;
  } catch (error) {
    console.error("[Firebase] Erro Crítico na Inicialização:", error);
    return null;
  }
}

export const db = initialize();
