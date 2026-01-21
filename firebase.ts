
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Configuração do Firebase via Variáveis de Ambiente.
 * O prefixo NEXT_PUBLIC_ é o padrão para exposição ao cliente no Vercel/Next.js.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Log de diagnóstico para ajudar o usuário a verificar se a Vercel está entregando as chaves
if (typeof window !== 'undefined') {
  console.log('--- DIAGNÓSTICO DE AMBIENTE ---');
  console.log('Projeto ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NÃO DEFINIDO');
  console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'CONFIGURADA' : 'AUSENTE');
  console.log('------------------------------');
}

function initialize() {
  // Garantir que a inicialização ocorra apenas no lado do cliente
  if (typeof window === 'undefined') return null;

  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    return db;
  } catch (error) {
    console.error("Falha ao inicializar Firebase:", error);
    return null;
  }
}

export const db = initialize();
