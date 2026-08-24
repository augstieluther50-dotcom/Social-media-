// =========================================================
// SIGNAL — Firebase project connection
// Safe to be public: these are client-facing identifiers,
// not secrets. Access is controlled by Firestore security rules.
// =========================================================

const firebaseConfig = {
  apiKey: "AIzaSyD2FGdjYr4vkjq09Kd2rqVeMN5PFNsCfCk",
  authDomain: "signal-438de.firebaseapp.com",
  projectId: "signal-438de",
  storageBucket: "signal-438de.firebasestorage.app",
  messagingSenderId: "199814219016",
  appId: "1:199814219016:web:c9a18a27587118056518bd",
  measurementId: "G-64B5LPHSCD"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
