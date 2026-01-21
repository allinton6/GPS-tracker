// js/dataModel.js - Firebase Realtime Database data model operations

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  push,
  get,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzFIGKh1HzjLrPaXKg_zyeo5lIJMRPKBI",
  authDomain: "gps-tracker-884b5.firebaseapp.com",
  databaseURL: "https://gps-tracker-884b5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gps-tracker-884b5",
  storageBucket: "gps-tracker-884b5.firebasestorage.app",
  messagingSenderId: "288475098762",
  appId: "1:288475098762:web:ffe7527df8d7c35365c773"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===== USERS =====
export function createUser(uid, userData) {
  const userRef = ref(db, `users/${uid}`);
  return set(userRef, {
    name: userData.name,
    phone: userData.phone,
    company: userData.company || '',
    role: userData.role || 'worker',
    activeSessionId: null,
    assignedTrackerId: null,
    ...userData
  });
}

export function updateUser(uid, updates) {
  const userRef = ref(db, `users/${uid}`);
  return update(userRef, updates);
}

export function getUser(uid) {
  const userRef = ref(db, `users/${uid}`);
  return get(userRef);
}

export function listenToUser(uid, callback) {
  const userRef = ref(db, `users/${uid}`);
  return onValue(userRef, (snapshot) => {
    callback(snapshot.val());
  });
}

// ===== TRACKERS =====
export function createTracker(trackerId, initialData = {}) {
  const trackerRef = ref(db, `trackers/${trackerId}`);
  return set(trackerRef, {
    last: {
      lat: null,
      lng: null,
      ts: null,
      speed: null,
      accuracy: null
    },
    status: {
      online: false,
      insideFence: true,
      outsideSinceTs: null,
      outsideCount: 0
    },
    pairedTo: null,
    ...initialData
  });
}

export function updateTrackerLocation(trackerId, locationData) {
  const trackerRef = ref(db, `trackers/${trackerId}`);
  return update(trackerRef, {
    last: {
      lat: locationData.lat,
      lng: locationData.lng,
      ts: Date.now(),
      speed: locationData.speed || null,
      accuracy: locationData.accuracy || null
    },
    status: {
      ...locationData.status,
      online: true
    }
  });
}

export function updateTrackerStatus(trackerId, statusUpdates) {
  const trackerRef = ref(db, `trackers/${trackerId}/status`);
  return update(trackerRef, statusUpdates);
}

export function pairTrackerToUser(trackerId, userData) {
  const trackerRef = ref(db, `trackers/${trackerId}/pairedTo`);
  return set(trackerRef, {
    uid: userData.uid,
    name: userData.name,
    company: userData.company,
    role: userData.role
  });
}

export function listenToTracker(trackerId, callback) {
  const trackerRef = ref(db, `trackers/${trackerId}`);
  return onValue(trackerRef, (snapshot) => {
    callback(snapshot.val());
  });
}

export function getAllTrackers(callback) {
  const trackersRef = ref(db, 'trackers');
  return onValue(trackersRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

// ===== ALERTS =====
export function createAlert(alertData) {
  const alertsRef = ref(db, 'alerts');
  const newAlertRef = push(alertsRef);
  return set(newAlertRef, {
    type: alertData.type, // "INITIAL" or "CONFIRMED"
    trackerId: alertData.trackerId,
    uid: alertData.uid,
    name: alertData.name,
    company: alertData.company,
    role: alertData.role,
    leftFenceTs: alertData.leftFenceTs,
    confirmedTs: alertData.confirmedTs || null,
    lastLat: alertData.lastLat,
    lastLng: alertData.lastLng,
    resolvedTs: null
  });
}

export function resolveAlert(alertId) {
  const alertRef = ref(db, `alerts/${alertId}`);
  return update(alertRef, {
    resolvedTs: Date.now()
  });
}

export function getActiveAlerts(callback) {
  const alertsRef = ref(db, 'alerts');
  return onValue(alertsRef, (snapshot) => {
    const alerts = snapshot.val() || {};
    const activeAlerts = Object.keys(alerts)
      .filter(key => !alerts[key].resolvedTs)
      .map(key => ({ id: key, ...alerts[key] }));
    callback(activeAlerts);
  });
}

// ===== SESSIONS =====
export function createSession(sessionData) {
  const sessionsRef = ref(db, 'sessions');
  const newSessionRef = push(sessionsRef);
  return set(newSessionRef, {
    uid: sessionData.uid,
    clockInTs: sessionData.clockInTs || Date.now(),
    clockOutTs: null,
    clockInLat: sessionData.clockInLat,
    clockInLng: sessionData.clockInLng,
    clockOutLat: null,
    clockOutLng: null,
    remarks: sessionData.remarks || '',
    createdBy: sessionData.createdBy || null
  });
}

export function clockOutSession(sessionId, clockOutData) {
  const sessionRef = ref(db, `sessions/${sessionId}`);
  return update(sessionRef, {
    clockOutTs: Date.now(),
    clockOutLat: clockOutData.lat,
    clockOutLng: clockOutData.lng
  });
}

export function getUserSessions(uid, callback) {
  const sessionsRef = ref(db, 'sessions');
  const userSessionsQuery = query(sessionsRef, orderByChild('uid'), equalTo(uid));
  return onValue(userSessionsQuery, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

// ===== REPORTS =====
export function updateGeofenceReport(date, trackerId, eventData) {
  const reportRef = ref(db, `reports/geofenceDaily/${date}/${trackerId}`);
  return get(reportRef).then((snapshot) => {
    const current = snapshot.val() || {
      totalOutsideCount: 0,
      totalOutsideDurationMs: 0,
      events: []
    };

    const updated = {
      totalOutsideCount: current.totalOutsideCount + (eventData.isExit ? 1 : 0),
      totalOutsideDurationMs: current.totalOutsideDurationMs + (eventData.durationMs || 0),
      events: [...current.events, eventData]
    };

    return set(reportRef, updated);
  });
}

// ===== UTILITIES =====
export function generateTrackerId() {
  return 'tracker_' + Math.random().toString(36).substring(2, 10);
}

export function getCurrentDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Geofence check (client-side approximation, server-side preferred)
export function isInsideGeofence(lat, lng, geofencePolygon = []) {
  // Simple point-in-polygon check
  // For production, use a proper geofence library or server-side check
  // Default geofence: Singapore Changi Airport area (approximate)
  const defaultFence = [
    [1.3644, 103.9915],
    [1.3644, 103.9955],
    [1.3684, 103.9955],
    [1.3684, 103.9915]
  ];

  const polygon = geofencePolygon.length > 0 ? geofencePolygon : defaultFence;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];

    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}