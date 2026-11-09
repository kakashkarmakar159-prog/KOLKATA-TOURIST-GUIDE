/* KTG local user profile. Profile and personal Gemini key stay in this browser only. */
(function(){
  'use strict';
  const PROFILE_KEY='ktg-user-profile-v1';
  const MAX_IMAGE_BYTES=300*1024;
  const $=(id)=>document.getElementById(id);
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function get(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch(_){return null}}
  function initials(name){return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'U'}
  function save(profile){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));localStorage.setItem('ktg-user-profile',JSON.stringify(profile));localStorage.setItem('ktg-chat-profile',JSON.stringify({name:profile.name,avatar:profile.avatar||''}));}
  function requestLocation(){
    if(!navigator.geolocation){setStatus('This browser does not support location. You can continue without it.');return}
    setStatus('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(pos=>{
      localStorage.setItem('ktg-location-permission','granted');
      localStorage.setItem('ktg-user-lat',String(pos.coords.latitude));
      localStorage.setItem('ktg-user-lng',String(pos.coords.longitude));
      sessionStorage.setItem('userLat',String(pos.coords.latitude));
      sessionStorage.setItem('userLng',String(pos.coords.longitude));
      setStatus('Location permission granted.');
    },err=>{
      localStorage.setItem('ktg-location-permission',err.code===1?'denied':'unavailable');
      setStatus(err.code===1?'Location was not allowed. You can enable it later in browser settings.':'Location unavailable. You can continue without it.');
    },{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
  }
  function setStatus(message){const el=$('ktgProfileStatus');if(el)el.textContent=message||''}
  function compressImage(file){
    return new Promise((resolve,reject)=>{
      if(!file||!file.type.startsWith('image/'))return reject(new Error('Please choose an image file.'));
      const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read the image.'));
      reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Invalid image file.'));img.onload=()=>{
        const canvas=document.createElement('canvas');let scale=Math.min(1,900/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
        let quality=.86;let data=canvas.toDataURL('image/jpeg',quality);
        while(data.length*0.75>MAX_IMAGE_BYTES&&quality>.35){quality-=.08;data=canvas.toDataURL('image/jpeg',quality)}
        while(data.length*0.75>MAX_IMAGE_BYTES&&(canvas.width>240||canvas.height>240)){canvas.width=Math.max(240,Math.round(canvas.width*.82));canvas.height=Math.max(240,Math.round(canvas.height*.82));ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/jpeg',Math.max(.35,quality))}
        if(data.length*0.75>MAX_IMAGE_BYTES)return reject(new Error('Image could not be reduced below 300 KB. Please choose a smaller image.'));
        resolve(data);
      };img.src=reader.result};reader.readAsDataURL(file);
    });
  }
  function injectStyles(){if(document.querySelector('link[data-ktg-profile-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='profile.css';l.dataset.ktgProfileCss='1';document.head.appendChild(l)}
  function ensureLauncher(){
    if($('ktgProfileLauncher'))return;
    const p=get();if(!p)return;
    const b=document.createElement('button');b.id='ktgProfileLauncher';b.className='ktg-profile-launcher';b.type='button';
    b.innerHTML=(p.avatar?`<img src="${p.avatar}" alt="">`:`<span class="ktg-mini-avatar">${esc(initials(p.name))}</span>`)+`<span>${esc(p.name)}</span>`;
    b.title='Edit your profile';b.addEventListener('click',()=>open(true));document.body.appendChild(b);
  }
  function open(edit){
    injectStyles();let shade=$('ktgProfileShade');if(shade)shade.remove();
    const p=get()||{};shade=document.createElement('div');shade.id='ktgProfileShade';shade.className='ktg-profile-shade';
    shade.innerHTML=`<section class="ktg-profile-card" role="dialog" aria-modal="true" aria-labelledby="ktgProfileTitle">
      <div class="ktg-profile-preview" id="ktgProfilePreview">${p.avatar?`<img src="${p.avatar}" alt="Profile photo">`:esc(initials(p.name||'You'))}</div>
      <h1 id="ktgProfileTitle">${edit?'Your Profile':'Create your Kolkata Tourist Guide profile'}</h1>
      <p class="ktg-sub">Set your display name and profile photo. This profile is saved on this browser and used in group chat.</p>
      <form id="ktgProfileForm">
        <label for="ktgProfileName">Your name *</label><input id="ktgProfileName" maxlength="60" required minlength="2" placeholder="Enter your name" value="${esc(p.name||'')}">
        <label for="ktgProfilePhoto">Profile photo (optional)</label><input id="ktgProfilePhoto" type="file" accept="image/*"><div class="ktg-help">Photos are automatically resized/compressed and saved at no more than 300 KB.</div>
        <label for="ktgGeminiKey">Your Gemini API Key (optional)</label><input id="ktgGeminiKey" type="password" autocomplete="off" placeholder="Paste your own Gemini API key" value="${esc(p.geminiApiKey||'')}">
        <label for="ktgGeminiModel">Gemini model</label><input id="ktgGeminiModel" value="${esc(p.geminiModel||'gemini-2.5-flash')}" placeholder="gemini-2.5-flash">
        <div class="ktg-profile-key-note">Your API key is stored only in this browser's local storage and is sent to Google Gemini when you use AI chat. It is not saved to the KTG server. Do not use a shared/public device. You can remove it any time here.</div>
        <div class="ktg-profile-status" id="ktgProfileStatus">${edit?'Changes are saved only on this device.':'Location permission will be requested after you create your profile.'}</div>
        <div class="ktg-profile-actions">${edit?'<button class="ktg-profile-cancel" id="ktgProfileClose" type="button">Cancel</button>':''}<button class="ktg-profile-save" type="submit">${edit?'Save Profile':'Create Profile & Continue'}</button></div>
      </form>
    </section>`;
    document.body.appendChild(shade);
    if(edit){$('ktgProfileClose').onclick=()=>shade.remove()}
    let avatar=p.avatar||'';
    $('ktgProfilePhoto').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;setStatus('Optimizing image…');try{avatar=await compressImage(f);$('ktgProfilePreview').innerHTML=`<img src="${avatar}" alt="Profile photo">`;setStatus(`Image ready (${Math.round(avatar.length*.75/1024)} KB).`)}catch(err){e.target.value='';setStatus(err.message)}});
    $('ktgProfileForm').addEventListener('submit',e=>{
      e.preventDefault();const name=$('ktgProfileName').value.trim();if(name.length<2){setStatus('Please enter at least 2 characters.');return}
      const key=$('ktgGeminiKey').value.trim();const model=$('ktgGeminiModel').value.trim()||'gemini-2.5-flash';
      const profile={id:p.id||((window.crypto&&crypto.randomUUID)?crypto.randomUUID():('ktg-'+Date.now())),name,avatar,geminiApiKey:key,geminiModel:model,updatedAt:new Date().toISOString()};
      try{save(profile)}catch(err){setStatus('Could not save. Please use a smaller photo or clear browser storage.');return}
      shade.remove();document.body.classList.add('ktg-profile-ready');ensureLauncher();
      if(!edit&&localStorage.getItem('ktg-location-permission')!=='granted'&&localStorage.getItem('ktg-location-permission')!=='denied')requestLocation();
      document.dispatchEvent(new CustomEvent('ktg:profile-updated',{detail:profile}));
    });
  }
  function init(){injectStyles();document.body.classList.add('ktg-profile-ready');const p=get();if(!p||!p.name){document.body.classList.remove('ktg-profile-ready');open(false)}else ensureLauncher();}
  window.KTGProfile={get,open,requestLocation,compressImage,MAX_IMAGE_BYTES};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
