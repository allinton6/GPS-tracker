// js/userTracking.js

let watchId = null;
let currentSessionId = null;
let currentUserId = null;

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function setStatus(msg) {
  const statusEl = document.getElementById("statusText");
  if (statusEl) statusEl.textContent = msg;
}

document.addEventListener("DOMContentLoaded", () => {
  const sessionIdDisplay = document.getElementById("sessionIdDisplay");
  const warningEl = document.getElementById("sessionWarning");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  const nameInput = document.getElementById("nameInput");
  const phoneInput = document.getElementById("phoneInput");
  const roleInput = document.getElementById("roleInput");

  currentSessionId = getQueryParam("session");

  if (!currentSessionId) {
    sessionIdDisplay.textContent = "—";
    warningEl.classList.remove("hidden");
    startBtn.disabled = true;
    setStatus("Invalid link. Please scan a valid QR code from the kiosk.");
    return;
  } else {
    sessionIdDisplay.textContent = currentSessionId;
    warningEl.classList.add("hidden");
  }

  startBtn.addEventListener("click", () => {
    const name = (nameInput.value || "").trim();
    const phone = (phoneInput.value || "").trim();
    const role = (roleInput.value || "").trim();

    if (!name || !phone) {
      alert("Please enter both your name and phone number.");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported on this device.");
      return;
    }

    // Create a simple user id (could also use push().key)
    currentUserId = `user-${Date.now().toString(36)}`;

    // Save basic user info once
    const userRef = window.firebaseDb.ref(`sessions/${currentSessionId}/users/${currentUserId}`);
    userRef.set({
      name,
      phone,
      role: role || null,
      createdAt: Date.now()
    });

    // Start watching position
    setStatus("Requesting GPS permission...");
    startBtn.disabled = true;
    stopBtn.disabled = false;

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const ts = Date.now();

        const locationRef = window.firebaseDb.ref(
          `sessions/${currentSessionId}/locations/${currentUserId}`
        );

        locationRef.set({
          name,
          phone,
          role: role || null,
          lat: latitude,
          lng: longitude,
          accuracy,
          lastUpdated: ts
        });

        setStatus(
          `Tracking active. Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(
            5
          )} (updated just now)`
        );
      },
      (err) => {
        console.error("Geolocation error:", err);
        setStatus("Error getting location: " + err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      }
    );
  });

  stopBtn.addEventListener("click", () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    setStatus("Tracking stopped. You may close this page.");
    stopBtn.disabled = true;

    // Optional: mark user as stopped in DB
    if (currentSessionId && currentUserId) {
      const locationRef = window.firebaseDb.ref(
        `sessions/${currentSessionId}/locations/${currentUserId}`
      );
      locationRef.update({ active: false });
    }

    // Gently "kick" them out after a short delay
    setTimeout(() => {
      window.location.href = "about:blank";
    }, 2000);
  });
});
