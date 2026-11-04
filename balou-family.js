// Balou Puppycoach — gedeelde, bewerkbare gezinsnamen
import { getApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const auth=getAuth(getApp()), db=getFirestore(getApp());
const members=[
 {uid:'ZEEQ2rghbSM5S8zZCSsvMvOFQRh1',name:'Papa',role:'ouder'},
 {uid:'UehltQjAMYU1Qk2Bq07EzvfMYmF3',name:'Mama',role:'ouder'},
 {uid:'zd6Id1hQuCWLV9qn8rBTv9FhCu92',name:'Wouter',role:'kind'},
 {uid:'2QZQccYpyYZwZ5YDVdTvvbRaNxq2',name:'Koen',role:'kind'}
];
const defaults=Object.fromEntries(members.map(m=>[m.uid,m.name]));
let names={...defaults},user=null,unsub=null;
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameOf=uid=>names[uid]||defaults[uid]||'Gezinslid';
// Oude registraties met e-mail blijven leesbaar; nieuwe gebruiken uitsluitend UID.
window.balouFamily={nameOf,display:(uid,legacy)=>uid?nameOf(uid):(legacy||'Gezin'),get currentUid(){return user?.uid||null;},get currentName(){return user?nameOf(user.uid):'';}};
const host=document.createElement('div');host.id='balou-family';
const settings=document.getElementById('instellingen');settings.append(host);
function render(){
 if(!user){host.innerHTML='';return;}
 const isParent=members.some(m=>m.uid===user.uid&&m.role==='ouder');
 host.innerHTML=`<div class="card"><h2>👨‍👩‍👦‍👦 Gezinsleden</h2><p class="muted">Namen zijn gekoppeld aan de Firebase-accounts. ${isParent?'Je kunt de weergavenamen aanpassen.':'Alleen ouders kunnen namen wijzigen.'}</p><form id="balou-family-form">${members.map(m=>`<label for="fam-${m.uid}">${escapeHtml(m.role==='ouder'?'Ouder':'Kind')}</label><input id="fam-${m.uid}" data-family-uid="${m.uid}" maxlength="35" required value="${escapeHtml(nameOf(m.uid))}" ${isParent?'':'disabled'} style="width:100%;padding:11px;border:1px solid #cbd8cf;border-radius:10px;font-size:16px">`).join('')}<p id="family-feedback" class="muted" role="status"></p>${isParent?'<button type="submit" class="btn" id="family-save">Gezinsnamen opslaan</button>':''}</form></div>`;
 if(isParent)host.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const button=host.querySelector('#family-save'),msg=host.querySelector('#family-feedback');
  const next={};for(const input of host.querySelectorAll('[data-family-uid]')){const name=input.value.trim();if(!name){msg.textContent='Vul alle namen in.';return;}next[input.dataset.familyUid]=name;}
  button.disabled=true;msg.textContent='Opslaan…';
  try{await setDoc(doc(db,'balouShared','family'),{names:next,updatedByUid:user.uid,updatedAt:serverTimestamp()},{merge:true});msg.textContent='✓ Namen gezamenlijk opgeslagen';}
  catch(err){msg.textContent='Opslaan mislukt: '+(err.code||err.message);}
  finally{button.disabled=false;}
 };
}
function refreshLabels(){
 // Bestaande onderdelen mogen op hun eigen moment opnieuw tekenen.
 window.dispatchEvent(new Event('balou-family-updated'));
}
onAuthStateChanged(auth,u=>{
 user=u;unsub?.();unsub=null;names={...defaults};render();refreshLabels();
 if(!u)return;
 unsub=onSnapshot(doc(db,'balouShared','family'),snap=>{
  names={...defaults,...(snap.exists()?snap.data().names||{}:{})};
  // Niet opnieuw renderen terwijl een ouder in een veld typt.
  if(!host.querySelector('input:focus'))render();
  refreshLabels();
 },err=>{const msg=host.querySelector('#family-feedback');if(msg)msg.textContent='Gezinsnamen laden mislukt: '+(err.code||err.message);});
});
