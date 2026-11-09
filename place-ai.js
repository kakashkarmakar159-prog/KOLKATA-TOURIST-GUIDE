/* Personal Gemini AI chat — uses the current visitor's profile key and memory. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DEFAULT_MODEL='gemini-3.8-flash';
  let history=[];let placeData=null;let busy=false;
  function keyForPlace(){return 'ktg-gemini-chat-'+(new URLSearchParams(location.search).get('id')||'general')}
  function addMessage(role,text){const box=$('ktgAiMessages');if(!box)return;const row=document.createElement('div');row.className='ktg-ai-message '+(role==='user'?'user':'assistant');row.innerHTML=`<div class="ktg-ai-bubble">${esc(text).replace(/\n/g,'<br>')}</div>`;box.appendChild(row);box.scrollTop=box.scrollHeight}
  function status(t){const el=$('ktgAiStatus');if(el)el.textContent=t||''}
  async function getPlace(){try{const r=await fetch('/places.json',{cache:'no-store'});if(r.ok){const arr=await r.json();const id=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('place');placeData=Array.isArray(arr)?arr.find(x=>String(x.id)===String(id)):null}}catch(_){}}
  function contextText(){if(!placeData)return 'Current page is Kolkata Tourist Guide. Answer general Kolkata tourism questions.';return JSON.stringify({name:placeData.name,description:placeData.description,metroStation:placeData.metroStation,openingHours:placeData.openingHours,closingDay:placeData.closingDay,ticketPrice:placeData.ticketPrice,attractions:placeData.attractions,contactNumber:placeData.contactNumber,website:placeData.website,latitude:placeData.latitude,longitude:placeData.longitude});}
  function profileMemory(profile){return String(profile?.memory||'').trim()}
  async function send(){
    if(busy)return;const input=$('ktgAiInput');const text=input?.value.trim();if(!text)return;
    const profile=window.KTGProfile?.get();if(!profile?.geminiApiKey){status('Add your Gemini API Key in Profile → AI Settings to use Kolkata Tourist AI.');window.KTGProfile?.open(true,'ai');return;}
    input.value='';addMessage('user',text);history.push({role:'user',parts:[{text}]});busy=true;$('ktgAiSend').disabled=true;status('Kolkata Tourist AI is thinking…');
    try{
      let model=String(profile.geminiModel||DEFAULT_MODEL).trim();if(model==='gemini-2.5-flash')model=DEFAULT_MODEL;model=model.replace(/[^a-zA-Z0-9._-]/g,'');
      const memory=profileMemory(profile);
      const systemText=`You are Kolkata Tourist AI, the helpful travel assistant inside Kolkata Tourist Guide. Reply in Bengali when the user writes Bengali; otherwise reply in the user's language. Be friendly, concise and accurate. Use the current place data below when relevant. Never invent opening hours, prices, contact details or travel facts; say when information is unavailable.\n\nCURRENT PLACE DATA:\n${contextText()}\n\nUSER PROFILE MEMORY (use only when relevant; do not expose it unnecessarily):\n${memory||'No personal memory has been saved.'}`;
      const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const contents=history.slice(-20);
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':profile.geminiApiKey},body:JSON.stringify({systemInstruction:{parts:[{text:systemText}]},contents,generationConfig:{temperature:.65,maxOutputTokens:1100}})});
      const data=await response.json();if(!response.ok){const detail=data?.error?.message||`Gemini request failed (${response.status})`;throw new Error(detail);}
      const answer=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim()||'Sorry, I could not generate a reply.';
      history.push({role:'model',parts:[{text:answer}]});addMessage('assistant',answer);try{localStorage.setItem(keyForPlace(),JSON.stringify(history.slice(-30)))}catch(_){}status('');
    }catch(err){history.pop();addMessage('assistant',`AI error: ${err.message}. Open Profile → AI Settings to check your API Key and model.`);status('AI could not connect.');}
    finally{busy=false;$('ktgAiSend').disabled=false;input.focus();}
  }
  async function init(){if(!$('ktgAiMessages'))return;await getPlace();try{history=JSON.parse(localStorage.getItem(keyForPlace())||'[]');history.forEach(m=>{const t=m.parts?.map(p=>p.text||'').join('');if(t)addMessage(m.role==='user'?'user':'assistant',t)})}catch(_){history=[]}if(!history.length)addMessage('assistant',`Hello${window.KTGProfile?.get()?.name?' '+window.KTGProfile.get().name:''}! Ask me about ${placeData?.name||'Kolkata'}, attractions, travel or visitor information.`);$('ktgAiSend').addEventListener('click',send);$('ktgAiInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});$('ktgAiKeyBtn')?.addEventListener('click',()=>window.KTGProfile?.open(true,'ai'));document.addEventListener('ktg:profile-updated',()=>status('Profile updated.'));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
