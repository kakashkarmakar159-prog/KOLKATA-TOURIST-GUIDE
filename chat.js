/* KTG real-time group chat — uses the saved browser profile identity. */
"use strict";

(function () {
  const params = new URLSearchParams(location.search);
  const place = params.get("place") || params.get("id") || "group";
  const groupId = `place-${place}`;
  const $ = id => document.getElementById(id);

  const members = new Map();
  const locations = new Map();
  const messages = new Map();
  const mapMarkers = new Map();

  let myName = "";
  let myAvatar = "";
  let replyingTo = null;
  let watchId = null;
  let map = null;
  let joined = false;
  let locationStarted = false;

  function readProfile() {
    try {
      return JSON.parse(
        localStorage.getItem("ktg-user-profile-v1") ||
        localStorage.getItem("ktg-user-profile") ||
        "null"
      );
    } catch (_) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2)
      .map(part => part[0] || "").join("").toUpperCase() || "?";
  }

  function timeLabel(timestamp) {
    return new Date(timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit"
    });
  }

  function addSystem(text) {
    const container = $("messages");
    if (!container) return;
    const item = document.createElement("div");
    item.className = "system";
    item.textContent = text;
    container.appendChild(item);
    scrollBottom();
  }

  function scrollBottom() {
    const container = $("messages");
    if (container) container.scrollTop = container.scrollHeight;
  }

  function updateIdentity(profile) {
    if (!profile || !profile.name) return false;
    myName = String(profile.name).trim().slice(0, 60);
    myAvatar = String(profile.avatar || "");
    const caption = document.querySelector(".name-caption");
    if (caption) caption.textContent = `Chatting as ${myName}`;
    return myName.length >= 2;
  }

  function openChat() {
    if (!myName) {
      addSystem("Please create your profile before joining the chat.");
      if (window.KTGProfile) window.KTGProfile.open(false);
      return;
    }
    if (!joined) {
      joined = true;
      if (!locationStarted) {
        locationStarted = true;
        requestLocation();
      }
    }
    socket.emit("joinGroup", { groupId, name: myName, avatar: myAvatar });
  }

  function updateMembers() {
    const container = $("members");
    if (!container) return;
    const list = [...members.values()];
    container.innerHTML = list.map(member => {
      const mine = member.id === socket.id;
      const avatar = member.avatar
        ? `<img src="${escapeHtml(member.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : escapeHtml(initials(member.name));
      return `<div class="member">
        <div class="member-avatar">${avatar}</div>
        <div class="member-info">
          <span class="member-name">${escapeHtml(member.name)}${mine ? " (you)" : ""}</span>
          <span class="member-status"><i class="online-dot"></i> Online</span>
        </div>
      </div>`;
    }).join("");
  }

  function renderMessage(message) {
    if (!message) return;
    const key = message.messageId || `${message.senderId || message.id}-${message.createdAt}`;
    if (messages.has(key)) return;
    messages.set(key, message);

    const container = $("messages");
    if (!container) return;

    const mine = message.senderId === socket.id;
    const row = document.createElement("div");
    row.className = `message-row ${mine ? "mine" : ""}`;
    row.dataset.messageId = key;

    const quoted = message.replyTo
      ? `<div class="quoted"><b>${escapeHtml(message.replyTo.name)}</b><div>${escapeHtml(message.replyTo.text)}</div></div>`
      : "";
    const senderAvatar = message.avatar || members.get(message.senderId)?.avatar || "";
    const avatar = mine ? "" : `<div class="avatar">${
      senderAvatar
        ? `<img src="${escapeHtml(senderAvatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : escapeHtml(initials(message.name))
    }</div>`;

    row.innerHTML = `${avatar}<div class="bubble">
      <strong>${escapeHtml(message.name || "Member")}</strong>
      ${quoted}
      <div class="bubble-text">${escapeHtml(message.text)}</div>
      <span class="meta">${timeLabel(message.createdAt)}</span>
      <button class="reply-btn" type="button" data-reply="${escapeHtml(key)}">↩ Reply</button>
    </div>`;
    container.appendChild(row);
    scrollBottom();
  }

  function setReply(message) {
    replyingTo = message;
    $("replyBar").hidden = false;
    $("replyName").textContent = message.name || "Member";
    $("replyText").textContent = message.text || "";
    $("messageInput").focus();
  }

  function clearReply() {
    replyingTo = null;
    $("replyBar").hidden = true;
    $("replyName").textContent = "";
    $("replyText").textContent = "";
  }

  function requestLocation() {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (!navigator.geolocation) {
      $("trackStatus").textContent = "This browser does not support live location.";
      return;
    }
    $("trackStatus").textContent = "Requesting your device location…";
    watchId = navigator.geolocation.watchPosition(position => {
      const payload = {
        groupId, name: myName,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy || null,
        timestamp: Date.now()
      };
      locations.set(socket.id, { ...payload, id: socket.id });
      socket.emit("locationUpdate", payload);
      $("trackStatus").textContent = "Your live location is being shared with the group.";
      $("myLocationText").textContent = `${payload.lat.toFixed(5)}, ${payload.lng.toFixed(5)}`;
      if (map) updateMapMarker({ ...payload, id: socket.id }, true);
    }, error => {
      $("trackStatus").textContent = error.code === 1
        ? "Location permission was not granted."
        : "Could not read your live location.";
      $("myLocationText").textContent = "Location not shared";
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  }

  function ensureMap() {
    if (map || typeof L === "undefined") return;
    map = L.map("liveMap", { zoomControl: true }).setView([22.5726, 88.3639], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap contributors"
    }).addTo(map);
  }

  function updateMapMarker(memberLocation, isMe = false) {
    if (!map || !memberLocation) return;
    const position = [memberLocation.lat, memberLocation.lng];
    let marker = mapMarkers.get(memberLocation.id);
    if (!marker) {
      marker = L.marker(position).addTo(map);
      mapMarkers.set(memberLocation.id, marker);
    } else {
      marker.setLatLng(position);
    }
    marker.bindPopup(
      `<b>${escapeHtml(memberLocation.name || "Member")}${isMe ? " (You)" : ""}</b><br>Live location`
    );
    renderLocationRows();
  }

  function renderLocationRows() {
    const container = $("otherLocationRows");
    if (!container) return;
    container.innerHTML = [...locations.values()]
      .filter(item => item.id !== socket.id)
      .map(item => `<div class="location-member"><span class="dot"></span><b>${escapeHtml(item.name)}</b><span>${Number(item.lat).toFixed(5)}, ${Number(item.lng).toFixed(5)}</span></div>`)
      .join("");
  }

  function openTrack() {
    $("trackDrawer").classList.add("open");
    $("trackDrawer").setAttribute("aria-hidden", "false");
    ensureMap();
    if (map) {
      setTimeout(() => map.invalidateSize(), 80);
      const points = [...locations.values()];
      points.forEach(item => updateMapMarker(item, item.id === socket.id));
      if (points.length) {
        const bounds = L.latLngBounds(points.map(item => [item.lat, item.lng]));
        if (bounds.isValid()) map.fitBounds(bounds.pad(.25));
      }
    } else {
      $("trackStatus").textContent = "Map service is unavailable. Check your internet connection.";
    }
  }

  function closeTrack() {
    $("trackDrawer").classList.remove("open");
    $("trackDrawer").setAttribute("aria-hidden", "true");
  }

  function setupTheme() {
    const saved = localStorage.getItem("ktg-chat-theme");
    if (saved === "dark") document.body.classList.add("dark");
    updateThemeButton();
    $("themeBtn").onclick = () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("ktg-chat-theme", document.body.classList.contains("dark") ? "dark" : "light");
      updateThemeButton();
      if (map) setTimeout(() => map.invalidateSize(), 60);
    };
  }

  function updateThemeButton() {
    $("themeBtn").textContent = document.body.classList.contains("dark") ? "☼" : "☾";
  }

  // Socket.IO is the real-time transport. The server broadcasts new messages
  // and member/location changes to every connected member of this place group.
  const chatServerUrl = String(window.KTG_CHAT_SERVER_URL || "").trim();
  const socketOptions = { reconnection: true, reconnectionAttempts: 8, timeout: 8000 };
  const socket = typeof io === "function"
    ? (chatServerUrl ? io(chatServerUrl, socketOptions) : io(socketOptions))
    : null;

  $("groupTitle").textContent = place.replaceAll("-", " ");
  setupTheme();
  $("backBtn").onclick = () => history.back();
  $("trackBtn").onclick = openTrack;
  $("closeTrack").onclick = closeTrack;
  $("trackDrawer").addEventListener("click", event => {
    if (event.target === $("trackDrawer")) closeTrack();
  });
  $("cancelReply").onclick = clearReply;

  $("messages").addEventListener("click", event => {
    const button = event.target.closest("[data-reply]");
    if (!button) return;
    const message = messages.get(button.dataset.reply);
    if (message) setReply(message);
  });

  $("messageForm").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("messageInput");
    const text = input.value.trim();
    if (!text) return;
    if (!socket || !socket.connected) {
      addSystem("Live chat server is not connected. Please try again in a moment.");
      return;
    }
    socket.emit("chatMessage", {
      groupId, text,
      replyTo: replyingTo ? {
        messageId: replyingTo.messageId,
        name: replyingTo.name,
        text: replyingTo.text
      } : null
    });
    input.value = "";
    clearReply();
  });

  if (socket) {
    socket.on("groupState", state => {
      (state.members || []).forEach(member => members.set(member.id, member));
      (state.locations || []).forEach(item => locations.set(item.id, item));
      (state.messages || []).forEach(renderMessage);
      updateMembers();
      renderLocationRows();
      if (map) [...locations.values()].forEach(item => updateMapMarker(item, item.id === socket.id));
    });

    socket.on("memberJoined", member => {
      members.set(member.id, member);
      updateMembers();
      if (member.id !== socket.id) addSystem(`${member.name} joined the chat.`);
    });

    socket.on("memberLeft", member => {
      members.delete(member.id);
      locations.delete(member.id);
      const marker = mapMarkers.get(member.id);
      if (marker && map) map.removeLayer(marker);
      mapMarkers.delete(member.id);
      updateMembers();
      renderLocationRows();
      addSystem(`${member.name} left the chat.`);
    });

    socket.on("chatMessage", renderMessage);

    socket.on("locationUpdate", item => {
      if (!item || item.groupId !== groupId || !item.id) return;
      locations.set(item.id, item);
      renderLocationRows();
      if (map) updateMapMarker(item, item.id === socket.id);
    });

    socket.on("connect", () => {
      const profile = readProfile();
      if (updateIdentity(profile)) openChat();
    });

    socket.on("connect_error", () => {
      $("trackStatus").textContent = "Connecting to live chat server…";
    });

    socket.on("disconnect", () => {
      $("trackStatus").textContent = "Disconnected. Reconnecting to live chat…";
    });
  } else {
    addSystem("Live chat needs the Kolkata Tourist Guide server to be running.");
  }

  // The profile is the single source of identity. Never ask for a second chat name.
  const initialProfile = readProfile();
  if (updateIdentity(initialProfile)) {
    openChat();
  } else {
    $("name-caption")?.remove();
    addSystem("Create your profile to start chatting. Your profile name and photo will be used automatically.");
  }

  document.addEventListener("ktg:profile-updated", event => {
    if (!updateIdentity(event.detail)) return;
    if (socket && socket.connected) openChat();
  });

  window.addEventListener("beforeunload", () => {
    if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  });
})();
