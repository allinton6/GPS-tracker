// js/firebaseConfig.js

// TODO: Replace with your own Firebase project config
// Go to Firebase Console → Project Settings → General → "Your apps" → Config
const firebaseConfig = {
  apiKey: "AIzaSyAzFIGKh1HzjLrPaXKg_zyeo5lIJMRPKBI",
  authDomain: "gps-tracker-884b5.firebaseapp.com",
  projectId: "gps-tracker-884b5",
  storageBucket: "gps-tracker-884b5.firebasestorage.app",
  messagingSenderId: "288475098762",
  appId: "1:288475098762:web:ffe7527df8d7c35365c773"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Realtime Database reference
const db = firebase.database();

// Make available globally (for other scripts)
window.firebaseDb = db;
