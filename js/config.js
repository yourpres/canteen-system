// =============================================
// Firebase Configuration
// San Ignacio Elementary School Canteen System
// =============================================
// IMPORTANT: Replace these values with your
// Firebase project credentials from:
// https://console.firebase.google.com
// =============================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence only enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence not available in this browser.');
  }
});

// =============================================
// Firestore Collections Reference
// =============================================
const COLLECTIONS = {
  USERS:          'users',
  DAILY_RECORDS:  'daily_records',
  INVENTORY:      'inventory',
  EXPENSES:       'monthly_expenses',
  NOTIFICATIONS:  'notifications'
};

// =============================================
// Expense Categories
// =============================================
const EXPENSE_CATEGORIES = {
  'F':  { label: 'Feeding',          color: '#FF6B35' },
  'C':  { label: 'Clinic',           color: '#E91E63' },
  'FP': { label: 'Faculty/Pupils',   color: '#9C27B0' },
  'H':  { label: 'HE',               color: '#3F51B5' },
  'S':  { label: 'School Operation', color: '#2196F3' },
  'R':  { label: 'Revolving',        color: '#009688' }
};
