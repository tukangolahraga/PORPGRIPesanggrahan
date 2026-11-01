'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session=null,selectedCategory='',selectedCode='',busy=false,pendingRequest=null,dirty=false;
function message(selector,text,error=false){const node=$(selector);node.textContent=text;node.classList.toggle('error',error);}
async function api(action,payload={}){
  if(!window.SCC_CONFIG?.publicDataUrl)throw new Error('Alamat layanan admin belum tersedia.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
  try{
    const response=await fetch(window.SCC_CONFIG.publicDataUrl,{method:'POST',credentials:'omit',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload}),signal:controller.signal});
    if(!response.ok)throw new Error('Layanan admin tidak dapat dihubungi.');
    let data;try{data=await response.json();}catch(e){throw new Error('Respons server belum sesuai. Coba muat ulang panel.');}
    if(!data.ok)throw new Error(data.error||'Permintaan tidak berhasil.');
    return data.result;
  }catch(e){if(e.name==='AbortError')throw new Error('Server belum memberi jawaban. Muat ulang data untuk memeriksa apakah hasil sudah tersimpan sebelum mencoba lagi.');throw e;}
  finally{clearTimeout(timer);}
}
function category(){return session?.data.categories.find(c=>c.id===selectedCategory);}
function teamName(cat,id){return cat.teams.find(t=>t.id===id)?.name||'Menunggu peserta';}
function outcome(cat,code,stack=[]){
  const m=cat.matches.find(x=>x.code===code);if(!m||stack.includes(code))return {a:null,b:null,winner:null,loser:null};
  const side=r=>r.team||outcome(cat,r.match,[...stack,code])[r.outcome==='loser'?'loser':'winner'];
  const a=side(m.a),b=side(m.b),ok=a&&b&&m.status==='completed'&&m.scoreA!==null&&m.scoreB!==null&&m.scoreA!==m.scoreB;
  return {a,b,winner:ok?(m.scoreA>m.scoreB?a:b):null,loser:ok?(m.scoreA>m.scoreB?b:a):null};
}
function sideLabel(cat,ref,id){return id?teamName(cat,id):`${ref.outcome==='loser'?'Kalah':'Pemenang'} ${ref.match}`;}
function acceptState(data){
  session=data;dirty=false;
  if(!category())selectedCategory=data.data.categories[0]?.id||'';
  $('#account-label').textContent='Masuk sebagai '+data.editor+' · Sesi berlaku maksimal '+data.expiresMinutes+' menit';
  $('#admin-category').innerHTML=data.data.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.sport)}${c.format==='judging'?'':' · '+esc(c.division)}</option>`).join('');
  $('#admin-category').value=selectedCategory;
  $('#login-screen').hidden=true;$('#workspace').hidden=false;renderCategory();
}
function renderCategory(){
  const cat=category();if(!cat)return;
  const items=cat.format==='judging'?cat.performances:cat.matches;
  if(!items.some(m=>m.code===selectedCode))selectedCode=items[0]?.code||'';
  $('#category-summary').textContent=cat.teams.length+' tim · '+items.length+(cat.format==='judging'?' penampilan':' pertandingan');
  $('#board-title').textContent=cat.format==='judging'?'Urutan penampilan Senam':'Alur '+cat.sport+' '+cat.division;
  $('#board-note').textContent=cat.format==='judging'?'Isi nilai total setiap peserta. Peringkat mengikuti nilai yang disimpan.':'Tim berikutnya mengikuti pemenang dan tim kalah semifinal dari bagan yang sama.';
  if(cat.format==='judging'){
    $('#admin-board').innerHTML=`<div class="performance-list">${cat.performances.map(p=>`<button class="match-choice ${p.code===selectedCode?'selected':''}" data-code="${esc(p.code)}" type="button"><span class="choice-head"><b>${esc(p.code)}</b><span>${p.score===null?'Menunggu nilai':'Sudah dinilai'}</span></span><span class="choice-team">${esc(teamName(cat,p.teamId))}<strong>${p.score===null?'—':esc(p.score)}</strong></span><small>${esc(p.start)}–${esc(p.end)} · ${esc(p.venue)}</small></button>`).join('')}</div>`;
  }else{
    const groups=[['PENDAHULUAN','01','Pendahuluan'],['PEREMPAT FINAL','02','Perempat final'],['SEMIFINAL','03','Semifinal'],['FINAL','04','Final & juara 3']];
    $('#admin-board').innerHTML=groups.map(([round,n,label])=>{
      const matches=cat.matches.filter(m=>round==='FINAL'?['FINAL','JUARA 3'].includes(m.round):m.round===round);
      return `<div class="round-column"><h3><span>${n}</span>${label}</h3>${matches.map(m=>{
        const o=outcome(cat,m.code),waiting=!o.a||!o.b;
        return `<button type="button" data-code="${esc(m.code)}" class="match-choice ${selectedCode===m.code?'selected':''} ${waiting?'waiting':''}"><span class="choice-head"><b>${esc(m.code)}</b><span>${o.winner?'Selesai':waiting?'Menunggu tim':m.setScores?.length?'Belum selesai':'Siap diisi'}</span></span><span class="choice-team ${o.winner&&o.winner===o.a?'winner':''}">${esc(sideLabel(cat,m.a,o.a))}<strong>${m.scoreA===null?'—':esc(m.scoreA)}</strong></span><span class="choice-team ${o.winner&&o.winner===o.b?'winner':''}">${esc(sideLabel(cat,m.b,o.b))}<strong>${m.scoreB===null?'—':esc(m.scoreB)}</strong></span><small>${esc(m.start||'Jam belum diatur')} · ${esc(m.venue)}</small></button>`;
      }).join('')}</div>`;
    }).join('');
  }
  $('#admin-board').querySelectorAll('[data-code]').forEach(button=>button.addEventListener('click',()=>{
    if(busy)return;if(dirty&&!confirm('Perubahan belum disimpan. Pindah pertandingan?'))return;
    selectedCode=button.dataset.code;dirty=false;renderCategory();
    if(matchMedia('(max-width: 850px)').matches)$('#editor-panel').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  renderEditor();
}
function renderEditor(){
  const cat=category(),target=(cat.format==='judging'?cat.performances:cat.matches).find(x=>x.code===selectedCode);
  if(!target)return;$('#editor-title').textContent=cat.sport+' · '+target.code;
  let form='',locked=false;
  if(cat.format==='judging'){
    form=`<div class="participants"><strong>${esc(teamName(cat,target.teamId))}</strong><small>Urutan tampil ${target.order} · ${esc(target.start)}–${esc(target.end)}</small></div><label for="judge-score">Nilai total</label><input id="judge-score" type="number" inputmode="decimal" min="0" max="1000" step="0.01" value="${target.score===null?'':esc(target.score)}" required><p class="field-note">Masukkan nilai total yang sudah disahkan juri. Nol adalah nilai, bukan kolom kosong.</p>${target.notes?`<div class="note-box"><b>Catatan peserta</b><p>${esc(target.notes)}</p><small>Catatan ini tetap dipertahankan saat nilai disimpan.</small></div>`:''}`;
  }else{
    const o=outcome(cat,target.code);locked=!o.a||!o.b;
    const a=sideLabel(cat,target.a,o.a),b=sideLabel(cat,target.b,o.b);
    form=`<div class="participants"><strong>${esc(a)}</strong><span>melawan</span><strong>${esc(b)}</strong></div>`;
    if(cat.scoring==='best_of_three_sets'){
      form+=`<p class="field-note">Isi poin set yang sudah selesai, secara berurutan. Tim maju setelah menang dua set. Jika 2–0, set ketiga dibiarkan kosong.</p><div class="set-table"><div class="set-header"><span>SET</span><b title="${esc(a)}">Tim A</b><b title="${esc(b)}">Tim B</b></div>${[0,1,2].map(i=>`<div><span>Set ${i+1}</span><input aria-label="Set ${i+1} Tim A" id="set-${i}-a" type="number" min="0" max="999" step="1" inputmode="numeric" value="${target.setScores?.[i]?.[0]??''}" ${locked?'disabled':''}><input aria-label="Set ${i+1} Tim B" id="set-${i}-b" type="number" min="0" max="999" step="1" inputmode="numeric" value="${target.setScores?.[i]?.[1]??''}" ${locked?'disabled':''}></div>`).join('')}</div>`;
    }else form+=`<div class="score-inputs"><div><label for="score-a">Skor Tim A</label><input id="score-a" type="number" inputmode="numeric" min="0" max="999" step="1" value="${target.scoreA??''}" required ${locked?'disabled':''}></div><span>:</span><div><label for="score-b">Skor Tim B</label><input id="score-b" type="number" inputmode="numeric" min="0" max="999" step="1" value="${target.scoreB??''}" required ${locked?'disabled':''}></div></div><p class="field-note">Skor akhir harus berbeda agar pemenang dapat ditentukan.</p>`;
    const next=cat.matches.filter(m=>[m.a,m.b].some(ref=>ref.match===target.code));
    if(next.length)form+=`<div class="next-round"><b>Alur setelah pertandingan</b>${next.map(m=>`<span>${m.a.match===target.code?m.a.outcome==='loser'?'Tim kalah':'Pemenang':m.b.outcome==='loser'?'Tim kalah':'Pemenang'} → ${esc(m.code)}</span>`).join('')}</div>`;
    if(locked)form+='<p class="locked-note">Kedua tim belum ditentukan. Selesaikan pertandingan sebelumnya dahulu.</p>';
  }
  $('#editor-content').innerHTML=`<form id="score-form">${form}<button class="primary" type="submit" id="preview-button" ${locked?'disabled':''}>Periksa & simpan hasil</button><button class="danger-text" id="clear-score" type="button">Kosongkan hasil ini</button><div id="editor-message" class="message" role="status"></div></form>`;
  $('#score-form').addEventListener('input',()=>{dirty=true;});
  $('#score-form').addEventListener('submit',e=>{e.preventDefault();preview('save');});
  $('#clear-score').addEventListener('click',()=>preview('clear'));
}
function numberInput(id){const value=$(id).value.trim();return value===''?null:Number(value);}
function collect(action){
  const cat=category(),request={token:session.token,categoryId:cat.id,code:selectedCode,revision:session.revisions[cat.id],action};
  if(action==='save'){
    if(cat.format==='judging')request.score=numberInput('#judge-score');
    else if(cat.scoring==='best_of_three_sets')request.setScores=[0,1,2].map(i=>[numberInput('#set-'+i+'-a'),numberInput('#set-'+i+'-b')]);
    else{request.scoreA=numberInput('#score-a');request.scoreB=numberInput('#score-b');}
  }
  return request;
}
function setBusy(value){busy=value;$('#workspace').inert=value;$('#login-button').disabled=value;}
async function preview(action){
  if(busy)return;message('#editor-message','Memeriksa data dan alur pertandingan…');setBusy(true);
  try{
    const request=collect(action),result=await api('preview',{request});pendingRequest=request;
    $('#confirmation-text').innerHTML=`<p class="confirmation-category">${esc(result.category)} · ${esc(result.code)}</p><p>${esc(result.summary)}</p>${result.winner?`<div class="winner-review"><small>TIM PEMENANG</small><strong>${esc(result.winner)}</strong></div>`:''}${result.affected.length?`<div class="reset-warning"><b>Periksa hasil babak lanjutan</b><p>Slot berikut akan dikosongkan agar skor lama tidak dipakai oleh tim yang berbeda:</p><strong>${result.affected.map(esc).join(' · ')}</strong><p>Isi kembali hasilnya setelah peserta yang benar tersedia.</p></div>`:''}`;
    message('#save-message','');$('#confirm-save').disabled=false;$('#cancel-save').disabled=false;$('#confirm-dialog').showModal();message('#editor-message','');
  }catch(e){message('#editor-message',e.message,true);}finally{setBusy(false);}
}
async function save(){
  if(busy||!pendingRequest)return;setBusy(true);$('#confirm-save').disabled=true;$('#cancel-save').disabled=true;message('#save-message','Menyimpan hasil dan memperbarui peserta…');
  try{
    const state=await api('save',{request:pendingRequest});pendingRequest=null;acceptState(state);$('#confirm-dialog').close();message('#global-message','Hasil berhasil disimpan. Peserta babak berikutnya mengikuti bagan terbaru.');
  }catch(e){message('#save-message',e.message,true);$('#cancel-save').disabled=false;}
  finally{setBusy(false);}
}
document.addEventListener('DOMContentLoaded',()=>{
  $('#login-form').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;setBusy(true);message('#login-message','Memeriksa akun dan memuat pertandingan…');
    try{const state=await api('login',{username:$('#username').value.trim(),password:$('#password').value});$('#password').value='';acceptState(state);message('#login-message','');}
    catch(err){message('#login-message',err.message,true);}finally{setBusy(false);}
  });
  $('#toggle-password').addEventListener('click',()=>{const show=$('#password').type==='password';$('#password').type=show?'text':'password';$('#toggle-password').textContent=show?'Tutup':'Lihat';$('#toggle-password').setAttribute('aria-label',show?'Sembunyikan password':'Tampilkan password');});
  $('#admin-category').addEventListener('change',()=>{if(dirty&&!confirm('Perubahan belum disimpan. Pindah kategori?')){$('#admin-category').value=selectedCategory;return;}selectedCategory=$('#admin-category').value;selectedCode='';dirty=false;renderCategory();});
  $('#reload').addEventListener('click',async()=>{if(busy)return;if(dirty&&!confirm('Perubahan belum disimpan. Muat ulang data?'))return;setBusy(true);message('#global-message','Memuat data terbaru…');try{acceptState(await api('state',{token:session.token}));message('#global-message','Data terbaru sudah dimuat.');}catch(e){message('#global-message',e.message,true);}finally{setBusy(false);}});
  $('#logout').addEventListener('click',async()=>{if(busy)return;if(dirty&&!confirm('Perubahan belum disimpan. Tetap keluar?'))return;setBusy(true);try{await api('logout',{token:session.token});}catch(e){}finally{session=null;dirty=false;$('#workspace').hidden=true;$('#login-screen').hidden=false;message('#login-message','Anda sudah keluar.');setBusy(false);}});
  $('#cancel-save').addEventListener('click',()=>{if(!busy){pendingRequest=null;$('#confirm-dialog').close();}});$('#confirm-save').addEventListener('click',save);
  $('#confirm-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();else pendingRequest=null;});
  $('#show-password').addEventListener('click',()=>{$('#password-form').reset();message('#password-message','');$('#password-dialog').showModal();});
  $('#cancel-password').addEventListener('click',()=>{if(!busy)$('#password-dialog').close();});
  $('#password-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  $('#password-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;if($('#new-password').value!==$('#repeat-password').value){message('#password-message','Ulangan password baru belum cocok.',true);return;}setBusy(true);message('#password-message','Menyimpan password baru…');try{acceptState(await api('password',{token:session.token,currentPassword:$('#current-password').value,newPassword:$('#new-password').value}));$('#password-form').reset();$('#password-dialog').close();message('#global-message','Password berhasil diganti. Sesi admin lain telah berakhir.');}catch(err){message('#password-message',err.message,true);}finally{setBusy(false);}});
  window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
});
