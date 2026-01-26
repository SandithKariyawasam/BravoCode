// client/src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider,type Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5MG5vBNGPTmVU2MSp_iVZbInAkCF9wPU",
  authDomain: "gen-lang-client-0741249377.firebaseapp.com",
  projectId: "gen-lang-client-0741249377",
  storageBucket: "gen-lang-client-0741249377.firebasestorage.app",
  messagingSenderId: "390828878853",
  appId: "1:390828878853:web:19dce204bd1a91c1bf006c",
  measurementId: "G-0D31EX8CVS"
};

const app = initializeApp(firebaseConfig);

// Export with Types
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db: Firestore = getFirestore(app);
export default app;