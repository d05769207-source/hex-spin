import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqk2HKkodUeTtEh_xRxrcHljrpfxWcIt4",
  authDomain: "lucky-chakra.firebaseapp.com",
  projectId: "lucky-chakra",
  storageBucket: "lucky-chakra.firebasestorage.app",
  messagingSenderId: "168560073638",
  appId: "1:168560073638:web:c06fcf6a418de96b570d67",
  measurementId: "G-Y8F7KJR1TB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);