/* KTG real-time place group chat. Uses the saved Profile identity; no second name prompt. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const place = (params.get("place") || params.get("id") || "group").trim();
  const groupId = `place-${place}`;
  const members = new Map(), locations = new Map(), messages = new Map(), mapMarkers = new Map(), typingUsers = new Map();
  let myName = "", myAvatar = "", myUserId = "", replyingTo = null, watchId = null, map = null, joined = false, locationStarted = false, typingTimer = null, lastTypingSent = 0;
  const profileKey = "ktg-user-profile-v1";
  const fallbackKey = "ktg-user-profile";

  function getStableUserId() {
    let id = localStorage.getItem("ktg-chat-user-id");
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `ktg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("ktg-chat-user-id", id);
    }
    return id;
  }
  function readProfile() {
    try {
      if (window.KTGProfile && typeof window.KTGProfile.get === "function") {
        const p = window.KTGProfile.get(); if (p) return p;
      }
      return JSON.parse(localStorage.getItem(profileKey) || localStorage.getItem(fallbackKey) || "null");
    } catch (_) { return null; }
  }
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const initials = n => String(n || "?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase() || "?";
  const timeLabel = t => new Date(t || Date.now()).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  function nearBottom(){const el=$("messages");return el && el.scrollHeight-el.scrollTop-el.clientHeight<140;}
  function scrollBottom(force=false){const el=$("messages");if(el && (force||nearBottom()))el.scrollTop=el.scrollHeight;}
  function addSystem(text){const el=$("messages");if(!el)return;const n=document.createElement("div");n.className="system";n.textContent=text;el.appendChild(n);scrollBottom(true);}
  function setConnection(ok,label){const el=$("connectionStatus");if(!el)return;el.classList.toggle("connected",!!ok);const span=el.querySelector("span");if(span)span.textContent=label;}
  function updateIdentity(profile){
    if(!profile || !String(profile.name||"").trim()) return false;
    myName=String(profile.name).trim().slice(0,60);myAvatar=String(profile.avatar||"");myUserId=getStableUserId();
    const caption=$("nameCaption");if(caption)caption.textContent=`Chatting as ${myName}`;
    return myName.length>=2;
  }
  function avatarMarkup(name,src,cls="avatar"){
    return `<div class="${cls}">${src?`<img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:esc(initials(name))}</div>`;
  }
  function openChat(){
    if(!socket || !socket.connected || !myName || joined)return;
    joined=true;
    socket.emit("joinGroup",{groupId,name:myName,avatar:myAvatar,userId:myUserId});
    $("messageInput").disabled=false;
  }
  function updateMembers(){
    const box=$("members");if(!box)return;
    const list=[...members.values()];
    box.innerHTML=list.map(m=>`<div class="member">${avatarMarkup(m.name,m.avatar,"member-avatar")}<div class="member-info"><span class="member-name">${esc(m.name)}${m.id===socket?.id?" · You":""}</span><span class="member-status"><i class="online-dot"></i> Online</span></div></div>`).join("");
    if(!list.length)box.innerHTML='<span style="font-size:11px;color:var(--muted);padding:8px">Waiting for members…</span>';
  }
  function renderMessage(m){
    if(!m)return;
    const key=m.messageId||`${m.senderId||m.id}-${m.createdAt}-${m.text}`;
    if(messages.has(key))return;
    messages.set(key,m);
    const box=$("messages");if(!box)return;
    const shouldScroll=nearBottom();
    const mine=(m.userId && m.userId===myUserId) || m.senderId===socket?.id;
    const row=document.createElement("div");row.className=`message-row ${mine?"mine":""}`;row.dataset.messageId=key;
    const quote=m.replyTo?`<div class="quoted"><b>${esc(m.replyTo.name)}</b><div>${esc(m.replyTo.text)}</div></div>`:"";
    const av=!mine?avatarMarkup(m.name,m.avatar):"";
    row.innerHTML=`${av}<div class="bubble"><strong>${esc(m.name||"Member")}</strong>${quote}<div class="bubble-text">${esc(m.text)}</div><span class="meta">${timeLabel(m.createdAt)}</span><button class="reply-btn" type="button" data-reply="${esc(key)}">↩ Reply</button></div>`;
    box.appendChild(row);
    if(shouldScroll||mine)scrollBottom(true);
  }
  function setReply(m){replyingTo=m;$("replyBar").hidden=false;$("replyName").textContent=m.name||"Member";$("replyText").textContent=m.text||"";$("messageInput").focus();}
  function clearReply(){replyingTo=null;$("replyBar").hidden=true;$("replyName").textContent="";$("replyText").textContent="";}
  function renderTyping(){
    const names=[...typingUsers.values()].filter(x=>x.id!==socket?.id).map(x=>x.name);
    $("typingIndicator").innerHTML=names.length?`${esc(names.slice(0,2).join(", "))} ${names.length===1?"is":"are"} typing<span class="typing-dots"></span>`:"";
  }
  function sendTyping(){
    if(!socket?.connected||!joined)return;
    const now=Date.now();if(now-lastTypingSent>900){socket.emit("typingStart",{groupId});lastTypingSent=now;}
    clearTimeout(typingTimer);typingTimer=setTimeout(()=>socket.emit("typingStop",{groupId}),1600);
  }
  function requestLocation(){
    if(!navigator.geolocation){$("trackStatus").textContent="This browser does not support location.";return;}
    $("trackStatus").textContent="Requesting location permission…";
    watchId=navigator.geolocation.watchPosition(pos=>{
      const item={groupId,name:myName,lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy||null,timestamp:Date.now()};
      locations.set(socket.id,{...item,id:socket.id});socket.emit("locationUpdate",item);
      $("trackStatus").textContent="Your live location is shared with this group.";
      $("myLocationText").textContent=`${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`;
      if(map)updateMapMarker({...item,id:socket.id},true);
    },err=>{$("trackStatus").textContent=err.code===1?"Location permission was not granted.":"Could not read your location."; $("myLocationText").textContent="Location not shared";},{enableHighAccuracy:true,maximumAge:3000,timeout:15000});
  }
  function ensureMap(){if(map||typeof L==="undefined")return;map=L.map("liveMap").setView([22.5726,88.3639],12);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);}
  function updateMapMarker(item,isMe=false){
    if(!map||!item)return;const point=[item.lat,item.lng];let marker=mapMarkers.get(item.id);
    if(!marker){marker=L.marker(point).addTo(map);mapMarkers.set(item.id,marker);}else marker.setLatLng(point);
    marker.bindPopup(`<b>${esc(item.name||"Member")}${isMe?" (You)":""}</b><br>Live location`);renderLocationRows();
  }
  function renderLocationRows(){
    const box=$("otherLocationRows");if(!box)return;
    box.innerHTML=[...locations.values()].filter(x=>x.id!==socket?.id).map(x=>`<div class="location-member"><span class="dot"></span><b>${esc(x.name)}</b><span>${Number(x.lat).toFixed(5)}, ${Number(x.lng).toFixed(5)}</span></div>`).join("");
  }
  function openTrack(){
    $("trackDrawer").classList.add("open");$("trackDrawer").setAttribute("aria-hidden","false");ensureMap();
    if(map){setTimeout(()=>map.invalidateSize(),100);const pts=[...locations.values()];pts.forEach(x=>updateMapMarker(x,x.id===socket?.id));if(pts.length){const b=L.latLngBounds(pts.map(x=>[x.lat,x.lng]));if(b.isValid())map.fitBounds(b.pad(.25));}}
    else $("trackStatus").textContent="Map service unavailable. Check your connection.";
  }
  function closeTrack(){$("trackDrawer").classList.remove("open");$("trackDrawer").setAttribute("aria-hidden","true");}
  function setupTheme(){if(localStorage.getItem("ktg-chat-theme")==="dark")document.body.classList.add("dark");updateThemeButton();$("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("ktg-chat-theme",document.body.classList.contains("dark")?"dark":"light");updateThemeButton();if(map)setTimeout(()=>map.invalidateSize(),60);};}
  function updateThemeButton(){$("themeBtn").textContent=document.body.classList.contains("dark")?"☼":"☾";}

  const backend=String(window.KTG_CHAT_SERVER_URL||"").trim();
  const socket=typeof io==="function"?io(backend||undefined,{transports:["websocket","polling"],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:700,reconnectionDelayMax:5000,timeout:15000}):null;

  $("groupTitle").textContent=place.replace(/[-_]+/g," ");
  $("messageInput").disabled=true;
  setupTheme();
  $("backBtn").onclick=()=>history.back();
  $("trackBtn").onclick=openTrack;$("closeTrack").onclick=closeTrack;
  $("trackDrawer").addEventListener("click",e=>{if(e.target===$("trackDrawer"))closeTrack();});
  $("cancelReply").onclick=clearReply;
  $("messages").addEventListener("click",e=>{const b=e.target.closest("[data-reply]");if(b){const m=messages.get(b.dataset.reply);if(m)setReply(m);}});
  $("messageInput").addEventListener("input",sendTyping);
  $("messageForm").addEventListener("submit",e=>{
    e.preventDefault();const input=$("messageInput"),text=input.value.trim();if(!text)return;
    if(!socket?.connected||!joined){addSystem("Reconnecting to the live chat… Your message has not been sent.");return;}
    socket.emit("chatMessage",{groupId,text,replyTo:replyingTo?{messageId:replyingTo.messageId,name:replyingTo.name,text:replyingTo.text}:null});
    input.value="";clearReply();socket.emit("typingStop",{groupId});input.focus();
  });

  if(socket){
    socket.on("connect",()=>{
      joined=false;setConnection(true,"Live");openChat();
      if(!locationStarted){locationStarted=true;requestLocation();}
    });
    socket.on("groupState",state=>{
      (state.members||[]).forEach(m=>members.set(m.id,m));
      (state.locations||[]).forEach(x=>locations.set(x.id,x));
      (state.messages||[]).forEach(renderMessage);
      updateMembers();renderLocationRows();if(map)[...locations.values()].forEach(x=>updateMapMarker(x,x.id===socket.id));
      $("messageInput").disabled=false;scrollBottom(true);
    });
    socket.on("memberJoined",m=>{members.set(m.id,m);updateMembers();if(m.id!==socket.id)addSystem(`${m.name} joined the chat.`);});
    socket.on("memberLeft",m=>{members.delete(m.id);locations.delete(m.id);typingUsers.delete(m.id);const marker=mapMarkers.get(m.id);if(marker&&map)map.removeLayer(marker);mapMarkers.delete(m.id);updateMembers();renderLocationRows();renderTyping();addSystem(`${m.name} left the chat.`);});
    socket.on("chatMessage",renderMessage);
    socket.on("locationUpdate",x=>{if(!x||x.groupId!==groupId||!x.id)return;locations.set(x.id,x);renderLocationRows();if(map)updateMapMarker(x,x.id===socket.id);});
    socket.on("typingStart",x=>{if(x?.id!==socket.id){typingUsers.set(x.id,x);renderTyping();}});
    socket.on("typingStop",x=>{typingUsers.delete(x?.id);renderTyping();});
    socket.on("connect_error",()=>{setConnection(false,"Reconnecting");$("messageInput").disabled=true;});
    socket.on("disconnect",()=>{joined=false;setConnection(false,"Reconnecting");$("messageInput").disabled=true;$("trackStatus").textContent="Chat connection lost. Reconnecting…";});
  }else{setConnection(false,"Unavailable");addSystem("Live chat could not load. Please refresh the page after checking your internet connection.");}

  const profile=readProfile();
  if(updateIdentity(profile)){
    // join happens after Socket.IO connects; do not ask for a second chat name.
  }else{
    $("nameCaption").textContent="Create your profile to start chatting";
    $("messageInput").disabled=true;
    addSystem("Please create your profile using the profile button. Your saved name and photo will be used here automatically.");
    if(window.KTGProfile)window.KTGProfile.open(false);
  }
  document.addEventListener("ktg:profile-updated",e=>{
    if(!updateIdentity(e.detail))return;
    if(socket?.connected){joined=false;openChat();}
  });
  window.addEventListener("beforeunload",()=>{if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);});
})();
