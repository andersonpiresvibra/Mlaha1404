import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// O arquivo firebase-applet-config.json é gerado automaticamente pelo sistema.
// @ts-ignore
import firebaseConfig from '../firebase-applet-config.json';

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
// @ts-ignore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth();

// Teste de conexão
async function testConnection() {
  try {
    // Apenas tenta ler se houver uma config real (não placeholder)
    if (firebaseConfig.apiKey !== 'PLACEHOLDER') {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Erro de conexão com o Firestore. Verifique sua configuração.");
    }
  }
}
testConnection();
