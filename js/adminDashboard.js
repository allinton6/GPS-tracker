// js/adminDashboard.js

let map;
let markers = {};
let activeSessionId = null;
let sessionListener = null;

function initMap() {
  // Centre near Singapore by default
  map = L.map("map").setView([1.3521, 103.8198], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

function setAdminStatus(text) {
  const el = document.getElementById("adminStatus");
  if (el) el.textContent = text;
}

function clearMarkers() {
  Object.values(markers).forEach((m) => map.removeLayer(m));
  markers = {};
}

function attachSessionListener(sessionId) {
  if (sessionListener) {
    sessionListener.off();
    sessionListener = null;
  }

  clearMarkers();
  setAdminStatus("Listening for locations in session: " + sessionId);

  const locationsRef = window.firebaseDb.ref(`sessions/${sessionId}/locations`);
  sessionListener = locationsRef;

  const userListEl = document.getElementById("userList");
  userListEl.innerHTML = "";

  locationsRef.on("value", (snapshot) => {
    const data = snapshot.val() || {};

    // Clear user list
    userListEl.innerHTML = "";

    Object.entries(data).forEach(([userId, info]) => {
      const { lat, lng, name, phone, role, lastUpdated } = info;
      if (typeof lat !== "number" || typeof lng !== "number") return;

      const position = [lat, lng];
      const label = name || userId;

      // Update or create marker
      if (markers[userId]) {
        markers[userId].setLatLng(position);
        markers[userId].setPopupContent(
          `<b>${label}</b><br>${role || ""}<br>${phone || ""}`
        );
      } else {
        const marker = L.marker(position).addTo(map);
        marker.bindPopup(
          `<b>${label}</b><br>${role || ""}<br>${phone || ""}`
        );
        markers[userId] = marker;
      }

      // Add to user list
      const li = document.createElement("li");
      const timeStr = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—";

      li.textContent = `${label} (${role || "No role"}) – Updated: ${timeStr}`;
      userListEl.appendChild(li);
    });

    const locationsArray = Object.values(data);
    if (locationsArray.length > 0) {
      const bounds = L.latLngBounds(
        locationsArray
          .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
          .map((p) => [p.lat, p.lng])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();

  const sessionInput = document.getElementById("sessionInput");
  const loadBtn = document.getElementById("loadSessionBtn");

  loadBtn.addEventListener("click", () => {
    const sessionId = (sessionInput.value || "").trim();
    if (!sessionId) {
      alert("Please enter a Session ID.");
      return;
    }
    activeSessionId = sessionId;
    attachSessionListener(sessionId);
  });
});
