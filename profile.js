/* KTG User Profile & Settings — one identity per browser/device. */
(function(){
  'use strict';
  const PROFILE_KEY='ktg-user-profile-v1';
  const LEGACY_KEY='ktg-user-profile';
  const MAX_IMAGE_BYTES=300*1024;
  const DEFAULT_MODEL='gemini-3.8-flash';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function get(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||localStorage.getItem(LEGACY_KEY)||'null')}catch(_){return null}}
  function initials(name){return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'U'}
  function save(profile){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));localStorage.setItem(LEGACY_KEY,JSON.stringify(profile));localStorage.setItem('ktg-chat-profile',JSON.stringify({name:profile.name,avatar:profile.avatar||''}));applyDesign(profile.design||{});}
  function setStatus(message){const el=$('ktgProfileStatus');if(el)el.textContent=message||''}
  function requestLocation(){
    if(!navigator.geolocation){setStatus('This browser does not support location. You can continue without it.');return;}
    setStatus('Please allow location access in the browser prompt…');
    navigator.geolocation.getCurrentPosition(pos=>{
      localStorage.setItem('ktg-location-permission','granted');
      localStorage.setItem('ktg-user-lat',String(pos.coords.latitude));localStorage.setItem('ktg-user-lng',String(pos.coords.longitude));
      sessionStorage.setItem('userLat',String(pos.coords.latitude));sessionStorage.setItem('userLng',String(pos.coords.longitude));
      setStatus('Location permission granted.');
    },err=>{localStorage.setItem('ktg-location-permission',err.code===1?'denied':'unavailable');setStatus(err.code===1?'Location was not allowed. You can enable it later in browser settings.':'Location unavailable. You can continue without it.');},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
  }
  function compressImage(file){
    return new Promise((resolve,reject)=>{
      if(!file||!file.type.startsWith('image/'))return reject(new Error('Please choose an image file.'));
      const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read the image.'));
      reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Invalid image file.'));img.onload=()=>{
        let w=img.width,h=img.height,scale=Math.min(1,1000/Math.max(w,h));w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
        const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');let quality=.86,data='';
        for(let attempt=0;attempt<18;attempt++){
          canvas.width=w;canvas.height=h;ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);data=canvas.toDataURL('image/jpeg',quality);
          if(data.length*.75<=MAX_IMAGE_BYTES)return resolve(data);
          if(quality>.42)quality-=.08;else{w=Math.max(160,Math.round(w*.82));h=Math.max(160,Math.round(h*.82));quality=.68;}
        }
        if(data.length*.75>MAX_IMAGE_BYTES)return reject(new Error('Image could not be reduced below 300 KB. Choose a smaller image.'));
        resolve(data);
      };img.src=reader.result;};reader.readAsDataURL(file);
    });
  }
  function applyDesign(design){
    const d=design||{};const text=Math.min(1.2,Math.max(.85,Number(d.textScale)||1));const page=Math.min(1.12,Math.max(.9,Number(d.pageScale)||1));
    document.documentElement.style.setProperty('--ktg-user-text-scale',String(text));
    document.documentElement.style.zoom=String(page);
    document.body?.classList.toggle('ktg-user-compact',d.compact===true);
  }
  function injectStyles(){if(document.querySelector('link[data-ktg-profile-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='profile.css';l.dataset.ktgProfileCss='1';document.head.appendChild(l);}
  function ensureLauncher(){
    const p=get();if(!p?.name)return;let b=$('ktgProfileLauncher');
    if(!b){b=document.createElement('button');b.id='ktgProfileLauncher';b.className='ktg-profile-launcher';b.type='button';b.title='Open profile and settings';b.addEventListener('click',()=>open(true));document.body.appendChild(b);}
    b.innerHTML=(p.avatar?`<img src="${p.avatar}" alt="">`:`<span class="ktg-mini-avatar">${esc(initials(p.name))}</span>`)+`<span>${esc(p.name)}</span>`;
  }
  function open(edit, initialTab){
    injectStyles();let shade=$('ktgProfileShade');if(shade)shade.remove();
    const p=get()||{};let avatar=p.avatar||'';const creating=!edit;
    shade=document.createElement('div');shade.id='ktgProfileShade';shade.className='ktg-profile-shade';
    shade.innerHTML=`<section class="ktg-profile-card" role="dialog" aria-modal="true" aria-labelledby="ktgProfileTitle">
      <div class="ktg-profile-top"><div><div class="ktg-profile-kicker">KOLKATA TOURIST GUIDE</div><h1 id="ktgProfileTitle">${creating?'Create your profile':'Profile & Settings'}</h1><p class="ktg-sub">${creating?'Create your identity once. You will not be asked for your name again on this browser.':'Manage your identity, website design, personal memory and AI settings.'}</p></div>${creating?'':'<button class="ktg-profile-x" id="ktgProfileClose" type="button" aria-label="Close">×</button>'}</div>
      ${creating?'':`<nav class="ktg-settings-tabs" aria-label="Profile settings"><button type="button" class="active" data-tab="profile">Profile</button><button type="button" data-tab="design">Design</button><button type="button" data-tab="memory">Memory</button><button type="button" data-tab="ai">AI Settings</button></nav>`}
      <form id="ktgProfileForm">
        <section class="ktg-tab-panel" data-panel="profile">
          <div class="ktg-profile-preview" id="ktgProfilePreview">${avatar?`<img src="${avatar}" alt="Profile photo">`:esc(initials(p.name||'You'))}</div>
          <label for="ktgProfileName">Your display name *</label><input id="ktgProfileName" maxlength="60" required minlength="2" placeholder="Enter your name" value="${esc(p.name||'')}">
          <label for="ktgProfilePhoto">Profile photo</label><input id="ktgProfilePhoto" type="file" accept="image/*"><div class="ktg-help">Your image is automatically compressed to a maximum of 300 KB.</div>
          ${creating?'<div class="ktg-info-note">Your name and photo will be used automatically in group chat, messages and your profile button. You can add your Gemini API Key later from AI Settings.</div>':''}
        </section>
        ${creating?'':`<section class="ktg-tab-panel" data-panel="design" hidden>
          <h2>Website appearance</h2><p class="ktg-help">Adjust the overall page and text size. Your choices are saved on this browser.</p>
          <label for="ktgPageScale">Overall interface size <output id="ktgPageScaleValue">100%</output></label><input id="ktgPageScale" type="range" min="0.90" max="1.12" step="0.01" value="${Number(p.design?.pageScale)||1}">
          <label for="ktgTextScale">Text size <output id="ktgTextScaleValue">100%</output></label><input id="ktgTextScale" type="range" min="0.85" max="1.20" step="0.01" value="${Number(p.design?.textScale)||1}">
          <label class="ktg-check"><input id="ktgCompact" type="checkbox" ${p.design?.compact?'checked':''}> Compact spacing</label>
          <button type="button" class="ktg-secondary" id="ktgResetDesign">Reset design</button>
        </section>
        <section class="ktg-tab-panel" data-panel="memory" hidden>
          <h2>My Memory</h2><p class="ktg-help">Add useful facts or preferences that Kolkata Tourist AI may use when answering your questions. This memory stays in this browser.</p>
          <label for="ktgMemory">Personal memory</label><textarea id="ktgMemory" rows="8" maxlength="8000" placeholder="Example: I prefer Bengali answers. I usually travel with my family.\nMy favourite places are…">${esc(p.memory||'')}</textarea>
          <div class="ktg-help"><span id="ktgMemoryCount">${(p.memory||'').length}</span>/8000 characters. Do not save passwords or sensitive information here.</div>
          <button type="button" class="ktg-secondary" id="ktgClearMemory">Clear memory</button>
        </section>
        <section class="ktg-tab-panel" data-panel="ai" hidden>
          <h2>Kolkata Tourist AI</h2><p class="ktg-help">Add your own Gemini API Key here when you are ready. No API Key is required to create a profile or use the other website features.</p>
          <label for="ktgGeminiKey">Gemini API Key</label><input id="ktgGeminiKey" type="password" autocomplete="off" placeholder="Paste your Gemini API Key" value="${esc(p.geminiApiKey||'')}">
          <label for="ktgGeminiModel">AI Model</label><select id="ktgGeminiModel"><option value="gemini-3.8-flash">Gemini 3.8 Flash (recommended)</option><option value="gemini-3.7-flash">Gemini 3.7 Flash</option><option value="gemini-3.5-flash">Gemini 3.5 Flash</option><option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option><option value="custom">Custom model ID</option></select>
          <input id="ktgGeminiCustomModel" placeholder="Enter custom model ID" value="${esc(p.geminiModel||DEFAULT_MODEL)}" hidden>
          <div class="ktg-info-note">The key is saved in this browser only and is sent to Google when you use AI chat. Do not add a personal key on a shared device. For a public website, a secure server-side proxy is safer.</div>
          <div class="ktg-ai-tools"><button type="button" class="ktg-secondary" id="ktgToggleKey">Show key</button><button type="button" class="ktg-secondary" id="ktgRemoveKey">Remove API Key</button></div>
        </section>`}
        <div class="ktg-profile-status" id="ktgProfileStatus">${creating?'Location permission will be requested after you create your profile.':'Your changes are stored on this browser.'}</div>
        <div class="ktg-profile-actions">${creating?'':'<button class="ktg-profile-cancel" id="ktgProfileCancel" type="button">Cancel</button>'}<button class="ktg-profile-save" type="submit">${creating?'Create Profile & Continue':'Save Settings'}</button></div>
      </form>
    </section>`;
    document.body.appendChild(shade);
    if(!creating){$('ktgProfileClose').onclick=()=>shade.remove();$('ktgProfileCancel').onclick=()=>shade.remove();}
    const modelSelect=$('ktgGeminiModel');if(modelSelect){const savedModel=(!p.geminiModel||p.geminiModel==='gemini-2.5-flash')?DEFAULT_MODEL:p.geminiModel;const known=[...modelSelect.options].some(o=>o.value===savedModel);modelSelect.value=known?savedModel:'custom';$('ktgGeminiCustomModel').hidden=known;$('ktgGeminiCustomModel').value=savedModel;modelSelect.addEventListener('change',()=>{$('ktgGeminiCustomModel').hidden=modelSelect.value!=='custom'});}
    const photo=$('ktgProfilePhoto');photo.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;setStatus('Optimizing image…');try{avatar=await compressImage(f);$('ktgProfilePreview').innerHTML=`<img src="${avatar}" alt="Profile photo">`;setStatus(`Image ready (${Math.round(avatar.length*.75/1024)} KB).`)}catch(err){e.target.value='';setStatus(err.message)}});
    shade.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{shade.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));shade.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==btn.dataset.tab)}));if(initialTab&&!creating){const target=shade.querySelector(`[data-tab="${initialTab}"]`);target?.click();}
    const pageRange=$('ktgPageScale'),textRange=$('ktgTextScale');
    function previewDesign(){const d={pageScale:Number(pageRange?.value||1),textScale:Number(textRange?.value||1),compact:$('ktgCompact')?.checked};applyDesign(d);if($('ktgPageScaleValue'))$('ktgPageScaleValue').textContent=Math.round(d.pageScale*100)+'%';if($('ktgTextScaleValue'))$('ktgTextScaleValue').textContent=Math.round(d.textScale*100)+'%';}
    pageRange?.addEventListener('input',previewDesign);textRange?.addEventListener('input',previewDesign);$('ktgCompact')?.addEventListener('change',previewDesign);
    $('ktgResetDesign')?.addEventListener('click',()=>{pageRange.value='1';textRange.value='1';$('ktgCompact').checked=false;previewDesign()});
    $('ktgMemory')?.addEventListener('input',()=>{$('ktgMemoryCount').textContent=$('ktgMemory').value.length});
    $('ktgClearMemory')?.addEventListener('click',()=>{$('ktgMemory').value='';$('ktgMemoryCount').textContent='0'});
    $('ktgToggleKey')?.addEventListener('click',()=>{const el=$('ktgGeminiKey');el.type=el.type==='password'?'text':'password';$('ktgToggleKey').textContent=el.type==='password'?'Show key':'Hide key'});
    $('ktgRemoveKey')?.addEventListener('click',()=>{$('ktgGeminiKey').value='';setStatus('API Key will be removed when you save.')});
    $('ktgProfileForm').addEventListener('submit',e=>{
      e.preventDefault();const name=$('ktgProfileName').value.trim();if(name.length<2){setStatus('Please enter at least 2 characters.');return;}
      const key=creating?'':$('ktgGeminiKey')?.value.trim()||p.geminiApiKey||'';
      let model=creating?(p.geminiModel||DEFAULT_MODEL):(modelSelect?.value==='custom'?$('ktgGeminiCustomModel').value.trim():modelSelect?.value)||DEFAULT_MODEL;
      if(!model)model=DEFAULT_MODEL;
      const design=creating?(p.design||{pageScale:1,textScale:1,compact:false}):{pageScale:Number(pageRange?.value||1),textScale:Number(textRange?.value||1),compact:!!$('ktgCompact')?.checked};
      const memory=creating?(p.memory||''):$('ktgMemory')?.value||'';
      const profile={...p,id:p.id||((window.crypto&&crypto.randomUUID)?crypto.randomUUID():('ktg-'+Date.now())),name,avatar,geminiApiKey:key,geminiModel:model,design,memory,updatedAt:new Date().toISOString()};
      try{save(profile)}catch(err){setStatus('Could not save. Please use a smaller photo or clear browser storage.');return;}
      shade.remove();document.body.classList.add('ktg-profile-ready');ensureLauncher();
      if(creating&&localStorage.getItem('ktg-location-permission')!=='granted'&&localStorage.getItem('ktg-location-permission')!=='denied')requestLocation();
      document.dispatchEvent(new CustomEvent('ktg:profile-updated',{detail:profile}));
    });
    if(!creating)previewDesign();
  }
  function init(){injectStyles();const p=get();if(p?.name){applyDesign(p.design||{});document.body.classList.add('ktg-profile-ready');ensureLauncher();}else{document.body.classList.remove('ktg-profile-ready');open(false);}}
  window.KTGProfile={get,open,requestLocation,compressImage,applyDesign,MAX_IMAGE_BYTES,DEFAULT_MODEL};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
