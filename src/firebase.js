import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCpWOypebmBxqdpp4fAEIhZU3jrbjqT_mw",
  authDomain: "homework-app-4318f.firebaseapp.com",
  databaseURL: "https://homework-app-4318f-default-rtdb.firebaseio.com",
  projectId: "homework-app-4318f",
  storageBucket: "homework-app-4318f.firebasestorage.app",
  messagingSenderId: "118761683992",
  appId: "1:118761683992:web:605670ef8f1e1ebce9176d"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);