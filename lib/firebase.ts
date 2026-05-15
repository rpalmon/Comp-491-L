import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCRY7meE2H4dQl_S8k9OX2XpNijO3RsfeE",
  authDomain: "summarize-efa06.firebaseapp.com",
  projectId: "summarize-efa06",
  storageBucket: "summarize-efa06.firebasestorage.app",
  messagingSenderId: "544227370533",
  appId: "1:544227370533:web:f34468f13b8a1b024101cc",
  measurementId: "G-EM96PTNWVV"
};

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
