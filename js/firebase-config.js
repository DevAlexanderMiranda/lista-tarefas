// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCTznLxnhTUcnrtlokwAIlCsOKAqFi3tv0",
  authDomain: "documentmanagement-23745.firebaseapp.com",
  projectId: "documentmanagement-23745",
  storageBucket: "documentmanagement-23745.firebasestorage.app",
  messagingSenderId: "956045333838",
  appId: "1:956045333838:web:51f828a31fcd398c1d7a1f",
  measurementId: "G-D42M0YRW4H",
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Referências para serviços do Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar persistência para funcionamento offline
db.enablePersistence().catch((err) => {
  console.error("Erro ao habilitar persistência:", err);
});

// Exportar para uso em outros arquivos
