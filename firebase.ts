
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// No ambiente do navegador (Client), acessamos as variáveis injetadas pela Vercel
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Log de depuração para o console do navegador
if (typeof window !== 'undefined') {
  console.log('[Firebase Init] Verificando Configurações...');
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    console.log(`${key}: ${value ? 'OK' : 'AUSENTE'}`);
  });
}

function getSafeFirestore() {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
  } catch (error) {
    console.error("Falha ao inicializar Firebase SDK:", error);
    return null;
  }
}

export const db = getSafeFirestore();
