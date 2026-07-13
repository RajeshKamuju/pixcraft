import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDsnQmaEvt46AV_2Scn4CayrZPP4_TsMwM",
  authDomain: "excellent-multiplexer-707pf.firebaseapp.com",
  projectId: "excellent-multiplexer-707pf",
  storageBucket: "excellent-multiplexer-707pf.firebasestorage.app",
  messagingSenderId: "1039879629606",
  appId: "1:1039879629606:web:7e0352b28214c54ee6efe7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "pixcraft-db");
const auth = getAuth(app);

export { app, db, auth };
