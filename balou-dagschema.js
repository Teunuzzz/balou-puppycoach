// Balou Puppycoach v7: gedeeld dagschema, weekdagvarianten en dagafwijkingen.
import { getApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const auth=getAuth(getApp()), db=getFirestore(getApp());
const section=document.getElementById('uitlaten');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const weekdays=['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
const base=[
 ['07:00','Plassen na wakker worden','plas',5,'Direct naar buiten'],
 ['07:15','Ontbijt','eten',15,'Eerste maaltijd, water beschikbaar'],
 ['07:35','Plassen en rustig spelen','spel',10,'Korte plasronde na eten en spelen'],
 ['07:50','Slapen / rust','rust',105,'Rustige slaapplek, niet wakker maken voor het schema'],
 ['09:35','Plassen en snuffelwandeling','wandeling',10,'Rustig snuffelen, geen verplichte afstand'],
 ['09:50','Naamherkenning / hierkomen','oefening',3,'Kort, positief en belonen'],
 ['10:00','Slapen / rust','rust',115,'Prikkelarm herstellen'],
 ['12:00','Middageten en plassen','eten',15,'Tweede maaltijd, daarna naar buiten'],
 ['12:30','Rustig spelen en socialisatie','spel',10,'Nieuwe ervaringen op eigen tempo'],
 ['13:00','Middagrust','rust',120,'Slapen naar behoefte'],
 ['15:00','Plassen en snuffelwandeling','wandeling',10,'Flexibel aanpassen aan Balou'],
 ['15:20','Oefenen: loslaten / rust','oefening',3,'Stop terwijl het nog leuk is'],
 ['15:30','Slapen / rust','rust',115,'Voldoende slaap is belangrijk'],
 ['17:30','Avondeten en plassen','eten',15,'Derde maaltijd, daarna naar buiten'],
 ['18:00','Gezinsspel','spel',10,'Onder toezicht met kinderen'],
 ['18:30','Avondrust','rust',140,'Rustige avond'],
 ['21:00','Korte plasronde','plas',5,'Alleen als hij wakker is, extra indien nodig'],
 ['22:30','Laatste plasronde','plas',5,'Rustig naar bed']
];
const keys=['wakker','ontbijt','spel_ochtend','rust_ochtend','wandeling_ochtend','training_ochtend','rust_voormiddag','middageten','socialisatie','middagrust','wandeling_middag','training_middag','rust_namiddag','avondeten','gezinsspel','avondrust','plas_avond','plas_laatste'];
const defaults=base.map((a,i)=>({id:keys[i],time:a[0],title:a[1],type:a[2],duration:a[3],note:a[4]}));
let user=null,selected=today(),template={standard:null,weekdays:{}},dayOverrides={},done={},unsubSchedule=null,unsubDay=null,loaded=false,dayLoaded=false,busy=false,editing=null;
const scheduleRef=doc(db,'balouSchedules','main');
const dayRef=()=>doc(db,'balouDays',selected);
function effective(){let list=template.standard||suggested();const w=new Date(selected+'T12:00:00').getDay();if(template.weekdays?.[w])list=template.weekdays[w];if(dayOverrides.schedule)list=dayOverrides.schedule;return list.map(x=>({...x})).sort((a,b)=>a.time.localeCompare(b.time));}
function config(){try{return {...{birth:'2026-09-26',home:'2026-11-21',wake:'07:00',bed:'22:30',meals:3},...JSON.parse(localStorage.getItem('balou_config')||'{}')}}catch{return {birth:'2026-09-26',home:'2026-11-21',wake:'07:00',bed:'22:30',meals:3}}}
function suggested(){const c=config(),w=Math.max(0,Math.floor((new Date(selected+'T12:00:00')-new Date(c.birth+'T12:00:00'))/604800000));const duration=w<12?10:w<16?15:w<20?20:w<28?30:40;return defaults.map(a=>({...a,time:a.id==='wakker'?c.wake:a.id==='plas_laatste'?c.bed:a.time,duration:a.type==='wandeling'?duration:a.duration})).filter(a=>c.meals>=3||a.id!=='middageten');}
const niceDate=d=>new Date(d+'T12:00:00').toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'});
function render(){if(!user){section.innerHTML='<div class="card">Log in om het gezamenlijke dagschema te bekijken.</div>';return;}
 const list=effective(),w=new Date(selected+'T12:00:00').getDay(),scope=dayOverrides.schedule?'Afwijkend dagschema':template.weekdays?.[w]?'Weekdagschema ('+weekdays[w]+')':template.standard?'Eigen standaardschema':'Leeftijdsvoorstel';
 section.innerHTML=`<div class="card"><h2>🐾 Balou's dagschema</h2><p class="muted">Samen plannen en afvinken. Rust, voeding, spel, oefeningen en wandelingen op één plek.</p><label for="bs-date">Datum</label><input id="bs-date" type="date" value="${selected}"><p class="muted">${esc(niceDate(selected))} · ${esc(scope)}</p><p class="muted">${loaded&&dayLoaded?'✓ Verbonden met Firebase':'Gegevens laden…'}</p><div class="progress"><div style="width:${list.length?Math.round(list.filter(x=>done[x.id]?.done).length/list.length*100):0}%"></div></div><p class="muted">${list.filter(x=>done[x.id]?.done).length} van ${list.length} activiteiten gedaan</p>${list.map(a=>`<div class="item" style="align-items:center"><input type="checkbox" data-bs-done="${esc(a.id)}" ${done[a.id]?.done?'checked':''} ${!dayLoaded?'disabled':''}><span style="flex:1"><b>${esc(a.time)} · ${esc(a.title)}</b><small>${esc(a.type)} · ${a.duration} min${a.note?' · '+esc(a.note):''}</small>${done[a.id]?.done?`<small>✓ ${esc((window.balouFamily?.display(done[a.id].byUid,done[a.id].by)||done[a.id].by||'Gezin'))}</small>`:''}</span><button class="btn secondary" data-bs-edit="${esc(a.id)}" style="padding:8px 10px">✎</button></div>`).join('')}<p class="muted">Bij jonge pups zijn extra plaspauzes na slapen, spelen en eten nodig. Dit is een flexibel voorstel, geen medisch voorschrift. Rust gaat voor op de klok.</p></div>
 <div class="card"><h2>Schema beheren</h2><p class="muted">Wijzig een activiteit met ✎ of voeg er een toe. Kies bij opslaan of de wijziging alleen vandaag, iedere ${weekdays[w]} of alle dagen geldt.</p><button class="btn secondary" id="bs-add">+ Activiteit toevoegen</button> <button class="btn secondary" id="bs-reset">Standaardvoorstel herstellen</button><p id="bs-message" class="muted" role="status"></p><div id="bs-editor"></div></div>`;
 section.querySelector('#bs-date').onchange=e=>{selected=e.target.value||today();subscribeDay();};
 section.querySelectorAll('[data-bs-done]').forEach(el=>el.onchange=async()=>{const before=!el.checked;el.disabled=true;try{await setDoc(dayRef(),{tasks:{[el.dataset.bsDone]:{done:!before,by:user.email,byUid:user.uid,at:serverTimestamp()}}},{merge:true});}catch(err){el.checked=before;alert('Afvinken mislukt: '+(err.code||err.message));}finally{el.disabled=false;}});
 section.querySelectorAll('[data-bs-edit]').forEach(el=>el.onclick=()=>editor(list.find(x=>x.id===el.dataset.bsEdit)));
 section.querySelector('#bs-add').onclick=()=>editor(null);
 section.querySelector('#bs-reset').onclick=()=>{if(confirm('Het leeftijdsvoorstel voor deze dag herstellen?'))saveList(suggested(),'day');};
 if(editing)editor(editing,false);
}
function editor(a,scroll=true){editing=a||{id:'extra_'+Date.now(),time:'12:00',title:'',type:'spel',duration:10,note:''};const host=section.querySelector('#bs-editor');if(!host)return;
 host.innerHTML=`<div style="border-top:1px solid #eee;margin-top:16px;padding-top:12px"><h2 style="font-size:17px">${a?'Activiteit aanpassen':'Nieuwe activiteit'}</h2><label>Titel</label><input id="bs-title" maxlength="100" value="${esc(editing.title)}" style="width:100%;padding:11px;border:1px solid #cbd8cf;border-radius:10px"><div class="grid"><div><label>Tijd</label><input id="bs-time" type="time" value="${esc(editing.time)}"></div><div><label>Duur (min)</label><input id="bs-duration" type="number" min="1" max="360" value="${editing.duration}" style="width:100%;padding:11px;border:1px solid #cbd8cf;border-radius:10px"></div></div><label>Soort</label><select id="bs-type">${['plas','wandeling','eten','spel','oefening','rust','verzorging','overig'].map(x=>`<option ${x===editing.type?'selected':''}>${x}</option>`).join('')}</select><label>Toelichting</label><textarea id="bs-note" maxlength="500">${esc(editing.note)}</textarea><label>Wijziging toepassen op</label><select id="bs-scope"><option value="day">Alleen ${esc(niceDate(selected))}</option><option value="weekday">Iedere ${weekdays[new Date(selected+'T12:00:00').getDay()]}</option><option value="standard">Alle dagen (standaard)</option></select><p><button class="btn" id="bs-save">Opslaan in Firebase</button> <button class="btn secondary" id="bs-cancel">Annuleren</button>${a?' <button class="btn secondary" id="bs-delete">Verwijderen</button>':''}</p></div>`;
 host.querySelector('#bs-cancel').onclick=()=>{editing=null;host.innerHTML='';};
 host.querySelector('#bs-save').onclick=()=>{const get=id=>host.querySelector('#bs-'+id).value;const title=get('title').trim(),duration=Number(get('duration'));if(!title||!get('time')||!Number.isInteger(duration)||duration<1||duration>360){alert('Vul een titel, tijd en geldige duur in.');return;}const next={...editing,title,time:get('time'),duration,type:get('type'),note:get('note').trim()};const scope=get('scope');const w=new Date(selected+'T12:00:00').getDay();const source=scope==='day'?effective():scope==='weekday'?(template.weekdays?.[w]||template.standard||suggested()):(template.standard||suggested());saveList([...source.filter(x=>x.id!==next.id),next],scope);};
 if(a)host.querySelector('#bs-delete').onclick=()=>{if(confirm('Activiteit uit dit schema verwijderen?')){const scope=host.querySelector('#bs-scope').value,w=new Date(selected+'T12:00:00').getDay(),source=scope==='day'?effective():scope==='weekday'?(template.weekdays?.[w]||template.standard||suggested()):(template.standard||suggested());saveList(source.filter(x=>x.id!==a.id),scope);}};
 if(scroll)host.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function saveList(list,scope){if(busy||!user)return;busy=true;const w=new Date(selected+'T12:00:00').getDay(),message=section.querySelector('#bs-message');if(message)message.textContent='Opslaan…';try{if(scope==='day')await setDoc(dayRef(),{schedule:list,scheduleUpdatedBy:user.email,scheduleUpdatedAt:serverTimestamp()},{merge:true});else if(scope==='weekday')await setDoc(scheduleRef(),{weekdays:{[w]:list},updatedBy:user.email,updatedAt:serverTimestamp()},{merge:true});else await setDoc(scheduleRef(),{standard:list,updatedBy:user.email,updatedAt:serverTimestamp()},{merge:true});editing=null;render();const m=section.querySelector('#bs-message');if(m)m.textContent='✓ Opgeslagen in Firebase';}catch(err){alert('Schema opslaan mislukt: '+(err.code||err.message));}finally{busy=false;}}
function subscribeDay(){unsubDay?.();dayLoaded=false;done={};dayOverrides={};render();if(!user)return;unsubDay=onSnapshot(dayRef(),s=>{dayLoaded=true;const data=s.exists()?s.data():{};dayOverrides={schedule:data.schedule||null};done=data.tasks||{};render();},err=>{dayLoaded=false;section.innerHTML='<div class="card">Daggegevens laden mislukt: '+esc(err.code||err.message)+'</div>';});}
onAuthStateChanged(auth,u=>{user=u;unsubSchedule?.();unsubDay?.();unsubSchedule=null;unsubDay=null;loaded=false;dayLoaded=false;template={standard:null,weekdays:{}};if(!u){render();return;}unsubSchedule=onSnapshot(scheduleRef,s=>{loaded=true;const data=s.exists()?s.data():{};template={standard:data.standard||null,weekdays:data.weekdays||{}};render();},err=>{loaded=false;section.innerHTML='<div class="card">Weekschema laden mislukt: '+esc(err.code||err.message)+'</div>';});subscribeDay();});
render();

window.addEventListener("balou-family-updated",()=>{if(user)render();});
