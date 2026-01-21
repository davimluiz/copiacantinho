
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configurações exatas enviadas pelo Firebase do usuário
const firebaseConfig = {
  apiKey: "AIzaSyCuvLhhu028SZLDsAhbkuJzmtIy-sdF714",
  authDomain: "cantinho-sandra-pedidos.firebaseapp.com",
  projectId: "cantinho-sandra-pedidos",
  storageBucket: "cantinho-sandra-pedidos.firebasestorage.app",
  messagingSenderId: "577696868824",
  appId: "1:577696868824:web:4f03c516b48ae12b4f2aad"
};

// Inicialização única e exportação da instância do Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
