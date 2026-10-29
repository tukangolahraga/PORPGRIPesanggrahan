
'use strict';
const $ = selector => document.querySelector(selector);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = x => x ? new Date(x+'T12:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : 'Tanggal belum diatur';
let championship = null;
let selectedCategory = 'hadang-putra';
const state = {fallback:false,activeSport:'hadang'};
const SPORT_INFO = {
  hadang:{name:'Hadang', icon:'🏃', blurb:'Pertandingan sistem gugur putra dan putri dengan bagan pohon, jadwal bergantian, serta perebutan juara 3.'},
  voli:{name:'Bola Voli', icon:'🏐', blurb:'Pertandingan putra dan putri dengan bagan pohon, skor penentu kemenangan, dan hasil kejuaraan.'},
  senam:{name:'Senam', icon:'🤸', blurb:'Jadwal penampilan 7 ranting peserta senam sudah tersedia. Nilai juri belum ada dalam file sumber.'}
};

function categoryById(id) {return championship.categories.find(c=>c.id===id);}
function teamName(cat,id){return cat.teams.find(t=>t.id===id)?.name || id || 'Menunggu';}
function lookupMatch(cat,code){return cat.matches.find(m=>m.code===code);}
function resolveSide(cat,side,stack=[]){
  if(!side)return {id:null,name:'Menunggu tim',pending:true};
  if(side.team) return {id:side.team,name:teamName(cat,side.team),pending:false};
  const m=lookupMatch(cat,side.match);
  if(!m||stack.includes(m.code)) return {id:null,name:'Referensi belum tersedia',pending:true};
  const r=resolveOutcome(cat,m,stack);
  const id=side.outcome==='loser'?r.loser:r.winner;
  return id?{id,name:teamName(cat,id),pending:false}:{id:null,name:(side.outcome==='loser'?'Kalah ':'Pemenang ')+side.match,pending:true};
}
function resolveOutcome(cat,match,stack=[]){
  const next=[...stack,match.code];
  const a=resolveSide(cat,match.a,next),b=resolveSide(cat,match.b,next);
  const as=Number(match.scoreA),bs=Number(match.scoreB);
  if(!a.id||!b.id||match.status!=='completed'||match.scoreA===null||match.scoreB===null||!Number.isFinite(as)||!Number.isFinite(bs)||as===bs){return {a,b,winner:null,loser:null};}
  const winner=as>bs?a.id:b.id, loser=as>bs?b.id:a.id;
  // Pending or incorrectly signed results should never advance a bracket.
  if(match.winner && match.winner!==winner)return {a,b,winner:null,loser:null};
  return {a,b,winner,loser};
}
function matchDisplay(cat,m){const out=resolveOutcome(cat,m);return {...out,scoreA:m.scoreA,scoreB:m.scoreB};}
function page(){return (location.hash.slice(1).split('/')[0]||'beranda').toLowerCase();}
function switchPage(){
  const current=['beranda','cabang','bagan','jadwal','hasil'].includes(page())?page():'beranda';
  document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==`screen-${current}`);
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===current));
  const target=location.hash.split('/')[1];
  if(!championship)return;
  if(current==='bagan' && target && categoryById(target))selectedCategory=target;
  if(current==='cabang' && target && SPORT_INFO[target])state.activeSport=target;
  if(current==='cabang')renderSportDetail();
  if(current==='bagan')renderBracket();
  if(current==='jadwal')renderSchedule();
  if(current==='hasil')renderResults();
}
function selectCategory(id){selectedCategory=id;location.hash=`#bagan/${id}`;switchPage();window.scrollTo({top:0,behavior:'smooth'});}
function selectSport(id){state.activeSport=id;location.hash=`#cabang/${id}`;switchPage();window.scrollTo({top:0,behavior:'smooth'});}
function renderSportDetail(){
  const data=SPORT_INFO[state.activeSport];if(!data)return;
  $('#sport-select').value=state.activeSport;
  const cats=championship.categories.filter(c=>c.sport===data.name);
  const totalTeams=cats.reduce((n,c)=>n+c.teams.length,0);
  const totalEvents=cats.reduce((n,c)=>n+c.matches.length+(c.performances||[]).length,0);
  const content=cats.map(c=>{
    if(c.format==='judging'){
      const items=(c.performances||[]).map(x=>`<div class="senam-entry"><span class="senam-seq">${esc(x.order)}</span><div><strong>${esc(teamName(c,x.teamId))}</strong><small>${esc(x.venue)} • ${esc(x.dayLabel||'Hari belum ditentukan')} • ${esc(x.start)}–${esc(x.end)}</small></div><span class="performance-score">${x.score===null?'Nilai belum ada':'Nilai '+esc(x.score)}</span></div>`).join('');
      return `<article class="senam-program"><h3>🤸 Jadwal Penampilan Senam</h3><p>${c.teams.length} tim • Urutan penampilan mengikuti sumber data • Nilai tampil setelah diisi panitia</p>${items}<button type="button" class="category-btn" id="show-senam-schedule">Lihat seluruh jadwal →</button></article>`;
    }
    return `<article class="category-detail"><div><h3>${esc(c.division)}</h3><p>${c.teams.length} tim • ${c.matches.length} laga • ${c.scoring==='best_of_three_sets'?'Menang 2 set':'Sistem gugur'}</p></div><div class="detail-actions"><a class="category-btn" href="#bagan/${esc(c.id)}">Lihat bagan →</a><button type="button" class="category-btn outline" data-sport-schedule="${esc(c.id)}">Lihat jadwal</button></div></article>`;
  }).join('');
  $('#sport-detail').innerHTML=`<div class="sport-detail-head"><span class="detail-emoji">${data.icon}</span><div><div class="eyebrow">PGRI KECAMATAN PESANGGRAHAN</div><h2>${esc(data.name)}</h2><p>${esc(data.blurb)}</p><div class="detail-metrics"><span>${cats.length} kategori</span><span>${totalTeams} tim</span><span>${totalEvents} agenda</span></div></div></div><div class="category-detail-list">${content}</div>`;
  document.querySelectorAll('[data-sport-schedule]').forEach(el=>el.addEventListener('click',()=>{location.hash='#jadwal';setTimeout(()=>{$('#filter-category').value=el.dataset.sportSchedule;renderSchedule();},0);}));
  const button=$('#show-senam-schedule');if(button)button.addEventListener('click',()=>{location.hash='#jadwal';setTimeout(()=>{$('#filter-category').value='senam';renderSchedule();},0);});
}
function renderMain(){
  if(!championship)return;
  const live=championship.categories.filter(c=>c.format==='knockout');
  $('#stat-teams').textContent=championship.categories.reduce((sum,c)=>sum+c.teams.length,0);
  $('#stat-matches').textContent=championship.categories.reduce((sum,c)=>sum+c.matches.length+(c.performances||[]).length,0);
  $('#stat-done').textContent=live.reduce((sum,c)=>sum+c.matches.filter(m=>resolveOutcome(c,m).winner).length,0);
  const sports=[{name:'Hadang',emoji:'🏃',desc:'Putra 9 tim dan Putri 9 tim • Lapangan berbeda',id:'hadang'},
  {name:'Bola Voli',emoji:'🏐',desc:'Putra 15 tim dan Putri 10 tim • Menang 2 set',id:'voli'},
  {name:'Senam',emoji:'🤸',desc:'7 tim • Jadwal penampilan • Nilai juri belum tersedia',id:'senam'}];
  $('#sport-grid').innerHTML=sports.map(s=>{
    const cats=championship.categories.filter(c=>c.sport===s.name);
    return `<div class="sport-card"><div class="sport-top"><div><div class="eyebrow" style="color:#e7f0fb">CABANG OLAHRAGA</div><div class="sport-name">${esc(s.name)}</div></div><span class="sport-emoji">${s.emoji}</span></div><div class="sport-card-content"><p>${esc(s.desc)}</p><a class="sport-detail-link" href="#cabang/${esc(s.id)}">Informasi cabang →</a><div class="category-buttons">${cats.map(c=>c.format==='judging'?`<a href="#cabang/senam" class="category-btn">${c.teams.length} peserta • Jadwal tampil</a>`:`<button type="button" class="category-btn" data-cat="${esc(c.id)}">${esc(c.division)} • ${c.teams.length} tim</button>`).join('')}</div></div></div>`;
  }).join('');
  document.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>selectCategory(b.dataset.cat)));
  $('#home-summary').innerHTML=[...live.map(c=>`<div class="summary-box"><h3>${esc(c.sport)} • ${esc(c.division)}</h3><strong>${c.matches.filter(m=>resolveOutcome(c,m).winner).length} / ${c.matches.length}</strong><p>Pertandingan selesai</p></div>`),...championship.categories.filter(c=>c.format==='judging').map(c=>`<div class="summary-box"><h3>🤸 Senam</h3><strong>${c.teams.length} peserta</strong><p>${(c.performances||[]).filter(x=>x.score!==null&&x.score!==undefined).length} penilaian tercatat</p></div>`)].join('');
  $('#category-select').innerHTML=live.map(c=>`<option value="${esc(c.id)}">${esc(c.sport)} • ${esc(c.division)} (${c.teams.length} tim)</option>`).join('');
  $('#filter-category').innerHTML='<option value="all">Semua cabang</option>'+championship.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.sport)}${c.format==='judging'?'':` • ${esc(c.division)}`}</option>`).join('');
  switchPage();
}
function bracketY(code,cat){
  if(code.startsWith('QF-'))return 127+Number(code.split('-')[1]-1)*145;
  if(code.startsWith('SF-'))return 200+Number(code.split('-')[1]-1)*290;
  if(code==='FINAL')return 345;
  if(code==='J3')return 622;
  // Match pendahuluan diletakkan dekat perempat final penerimanya.
  const qf=cat.matches.find(m=>m.code.startsWith('QF-') && [m.a?.match,m.b?.match].includes(code));
  if(!qf)return 110;
  const refs=[qf.a?.match,qf.b?.match].filter(Boolean);
  const shift=refs.length===2?(refs[0]===code?-39:39):0;
  return bracketY(qf.code,cat)+shift;
}
function bracketX(code){return code.startsWith('P-')?15:code.startsWith('QF-')?305:code.startsWith('SF-')?595:885;}
function drawBranch(a,b,stroke='#b6cadc'){
  const x1=bracketX(a.code)+230,y1=a.y,x2=bracketX(b.code),y2=b.y;
  const mid=(x1+x2)/2;
  return `<path d="M${x1} ${y1} H${mid} V${y2} H${x2}" fill="none" stroke="${stroke}" stroke-width="2"/>`;
}
function renderBracket(){
  const cat=categoryById(selectedCategory);if(!cat||!cat.matches.length)return;
  $('#category-select').value=cat.id;
  const matches=cat.matches.map(m=>({...m,y:bracketY(m.code,cat)}));
  let lines='';
  for(const m of matches){
    if(m.round==='PENDAHULUAN'){
      const parent=matches.find(q=>q.code.startsWith('QF-')&&[q.a?.match,q.b?.match].includes(m.code));
      if(parent)lines+=drawBranch(m,parent,'#9dbbd5');
    }
    if(m.round==='PEREMPAT FINAL'){
      const parent=matches.find(q=>q.code.startsWith('SF-')&&[q.a?.match,q.b?.match].includes(m.code));
      if(parent)lines+=drawBranch(m,parent,'#7fb2a9');
    }
    if(m.round==='SEMIFINAL'){
      const parent=matches.find(q=>q.code==='FINAL');
      if(parent)lines+=drawBranch(m,parent,'#d0a451');
      const bronze=matches.find(q=>q.code==='J3');
      if(bronze){const x1=bracketX(m.code)+230, x2=bracketX('J3'), y1=m.y, y2=bronze.y, mid=x1+34;lines+=`<path d="M${x1} ${y1} H${mid} V${y2} H${x2}" fill="none" stroke="#b8926f" stroke-width="1.6" stroke-dasharray="4 7" opacity=".7"/>`;}
    }
  }
  const labels=[['PENDAHULUAN',15],['PEREMPAT FINAL',305],['SEMIFINAL',595],['FINAL & JUARA 3',885]];
  const cards=matches.map(m=>{
    const v=matchDisplay(cat,m),done=!!v.winner;
    const entry=(t,score)=>`<div class="participant ${t.pending?'pending':''} ${done&&v.winner===t.id?'winner':''}"><span class="team" title="${esc(t.name)}">${esc(t.name)}</span><span class="score">${score===null||score===undefined?'—':esc(score)}</span></div>`;
    return `<article class="match-card ${m.code==='FINAL'?'final':''} ${m.code==='J3'?'bronze':''}" style="left:${bracketX(m.code)}px;top:${m.y}px"><div class="match-title"><span>${esc(m.round)} • ${esc(m.code)}</span><span>${done?'✓ SELESAI':esc(m.start||'—')}</span></div>${entry(v.a,m.scoreA)}${entry(v.b,m.scoreB)}${Array.isArray(m.setScores)&&m.setScores.length?`<div class="match-set-summary">${m.setScores.map((s,j)=>`Set ${j+1}: ${esc(s[0])}–${esc(s[1])}`).join(' · ')}</div>`:''}</article>`;
  }).join('');
  $('#bracket').innerHTML=`<svg class="tree-lines" viewBox="0 0 1180 790" aria-hidden="true"><g>${lines}</g></svg>${labels.map(([v,x])=>`<div class="bracket-label" style="left:${x}px;width:230px">${v}</div>`).join('')}${cards}`;
  const final=cat.matches.find(m=>m.code==='FINAL'),bronze=cat.matches.find(m=>m.code==='J3');
  const f=resolveOutcome(cat,final),b=resolveOutcome(cat,bronze);
  $('#champions').innerHTML=[['🥇 JUARA 1',f.winner],['🥈 JUARA 2',f.loser],['🥉 JUARA 3',b.winner]].map(([label,id])=>`<div class="champion-item"><b>${label}</b><strong>${esc(id?teamName(cat,id):'Menunggu hasil pertandingan')}</strong></div>`).join('');
}
function minuteOf(x){if(!/^\d\d:\d\d$/.test(x||''))return null;const [h,m]=x.split(':').map(Number);return h*60+m;}
function renderSchedule(){
  const selected=$('#filter-category').value,round=$('#filter-round').value;
  const term=($('#schedule-search').value||'').toLocaleLowerCase('id-ID').trim();
  const rows=[];
  for(const cat of championship.categories){
    if(selected!=='all'&&selected!==cat.id)continue;
    if(cat.format==='judging'){
      for(const p of cat.performances||[]){
        if(round!=='all'&&round!=='PENAMPILAN')continue;
        const display=teamName(cat,p.teamId);
        if(term&&!([display,p.venue,cat.sport,cat.division].join(' ').toLocaleLowerCase('id-ID').includes(term)))continue;
        rows.push({cat,m:p,v:{a:{name:display},b:{name:'—'},winner:p.score!==null},judging:true});
      }
    } else {
      for(const m of cat.matches){if(round!=='all'&&m.round!==round)continue;
        const v=matchDisplay(cat,m);
        if(term&&!([v.a.name,v.b.name,m.venue,cat.sport,cat.division].join(' ').toLocaleLowerCase('id-ID').includes(term)))continue;
        rows.push({cat,m,v,judging:false});
      }
    }
  }
  const dayNumber=x=>{const label=String(x?.dayLabel||'');const m=label.match(/\d+/);return m?+m[0]:1;};
  rows.sort((a,b)=>(a.m.date||'').localeCompare(b.m.date||'')||dayNumber(a.m)-dayNumber(b.m)||(minuteOf(a.m.start)??9999)-(minuteOf(b.m.start)??9999)||a.cat.id.localeCompare(b.cat.id)||a.m.order-b.m.order);
  $('#schedule-body').innerHTML=rows.map(({cat,m,v,judging},i)=>{
    const status=judging?(m.score===null?'Menunggu nilai':'Dinilai'):(v.winner?'Selesai':'Dijadwalkan');
    const score=judging?(m.score===null?'—':'Nilai '+esc(m.score)):(m.scoreA===null?'—':esc(m.scoreA))+(judging?'':(' : '+(m.scoreB===null?'—':esc(m.scoreB))));
    const setTooltip=!judging&&Array.isArray(m.setScores)&&m.setScores.length?`<br><small>${m.setScores.map((s,j)=>`Set ${j+1}: ${esc(s[0])}–${esc(s[1])}`).join(' · ')}</small>`:'';
    return `<tr><td>${i+1}</td><td><strong>${esc(cat.sport)}</strong><br>${esc(cat.division)}</td><td>${judging?'PENAMPILAN':esc(m.round)} <small>${esc(m.code)}</small></td><td>${esc(v.a.name)}</td><td class="score-inline">${score}${setTooltip}</td><td>${esc(v.b.name)}</td><td>${esc(m.start||'—')}–${esc(m.end||'—')}<br><small>${esc(m.date?fmtDate(m.date):(m.dayLabel||'Hari belum ditentukan'))}</small></td><td>${esc(m.venue||'—')}</td><td><span class="pill ${v.winner?'complete':''}">${status}</span></td></tr>`;
  }).join('')||'<tr><td colspan="9">Belum ada jadwal untuk filter ini.</td></tr>';
  const warning=$('#conflict-warning');const clashes=[];
  if(selected==='all'){
    const all=rows.filter(e=>minuteOf(e.m.start)!==null&&minuteOf(e.m.end)!==null);
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
      const a=all[i],b=all[j];
      if(a.cat.id===b.cat.id||a.m.venue!==b.m.venue||(a.m.date||a.m.dayLabel)!==(b.m.date||b.m.dayLabel))continue;
      if(minuteOf(a.m.start)<minuteOf(b.m.end)&&minuteOf(b.m.start)<minuteOf(a.m.end))clashes.push([a,b]);
    }
  }
  warning.hidden=!clashes.length;
  if(clashes.length)warning.textContent=`⚠ Ada ${clashes.length} pasangan agenda dari kategori berbeda yang berpotensi bentrok di lokasi bernama sama. Excel belum mencantumkan tanggal kalender. Verifikasi pembagian lokasi/hari oleh panitia; “Hari 1/Hari 2” belum tentu sama untuk semua cabang.`;
}
function renderResults(){
  $('#result-grid').innerHTML=championship.categories.map(cat=>{
    if(cat.format==='judging'){
      const records=(cat.performances||[]).filter(x=>Number.isFinite(x.score));
      const allDone=records.length===cat.teams.length && records.length>0;
      const sorted=records.slice().sort((a,b)=>b.score-a.score);
      return `<div class="result-card"><h3>🤸 Senam</h3><p>${cat.teams.length} peserta • ${records.length} nilai tercatat</p>${allDone?`<p>Peringkat berdasarkan nilai total yang diinput panitia (aturan penilaian perlu disahkan).</p>${sorted.slice(0,3).map((x,i)=>`<div class="result-item">${['🥇','🥈','🥉'][i]} Peringkat ${i+1}<strong>${esc(teamName(cat,x.teamId))} • ${esc(x.score)}</strong></div>`).join('')}`:'<p>Peringkat belum tersedia karena penilaian juri belum lengkap.</p>'}</div>`;
    }
    const f=resolveOutcome(cat,lookupMatch(cat,'FINAL')),b=resolveOutcome(cat,lookupMatch(cat,'J3'));
    return `<div class="result-card"><h3>${esc(cat.sport)} • ${esc(cat.division)}</h3>${[['🥇 Juara 1',f.winner],['🥈 Juara 2',f.loser],['🥉 Juara 3',b.winner]].map(([k,id])=>`<div class="result-item">${k}<strong>${esc(id?teamName(cat,id):'Belum ditentukan')}</strong></div>`).join('')}</div>`;
  }).join('');
}
async function remoteData(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    const endpoint=new URL(url);endpoint.searchParams.set('mode','data');endpoint.searchParams.set('_',Date.now());
    const response=await fetch(endpoint.href,{credentials:'omit',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('Backend merespons HTTP '+response.status);
    return await response.json();
  }finally{clearTimeout(timer);}
}
async function refresh(){
  try{
    if(window.SCC_CONFIG?.publicDataUrl){const live=await remoteData(window.SCC_CONFIG.publicDataUrl);if(!live || !Array.isArray(live.categories) || !live.categories.length || live.categories.some(c=>!Array.isArray(c.teams)||!Array.isArray(c.matches)))throw new Error("Struktur data backend tidak valid");championship=live;state.fallback=false;}
    else if(window.SCC_SEED){championship=window.SCC_SEED;state.fallback=true;}
    else{const res=await fetch('data/seed.json',{cache:'no-store'});if(!res.ok)throw new Error('File data tidak bisa dibaca');championship=await res.json();state.fallback=true;}
    const source=state.fallback?'Pratinjau dari TUANABU.xlsx (29 Oktober 2026): belum tersambung ke Google Sheets, tidak diperbarui langsung.':(championship.source==='original_sheets'?'Tersambung langsung: data dibaca dari Google Sheets TUANABU.':'Tersambung: data dibaca dari Google Sheets melalui Apps Script.')+(championship.warnings?.length?' '+championship.warnings.join(' '):'');
    $('#source-notice').textContent=source;
    $('#last-update').textContent=state.fallback?'Impor TUANABU.xlsx':`Pembaruan ${new Date().toLocaleTimeString('id-ID')}`;
    renderMain();
  }catch(err){
    console.warn('PGRI live data unavailable:',err.name,err.message);
    // When live backend is unreachable, do not pretend this is current data.
    try{const res=await fetch('data/seed.json');championship=await res.json();state.fallback=true;renderMain();$('#last-update').textContent='Salinan TUANABU.xlsx — belum sinkron';$('#source-notice').textContent='⚠ Backend tidak tersedia. Data yang tampil adalah salinan awal dari Excel, bukan hasil pertandingan terbaru.';}
    catch(_){$('#source-notice').textContent='Gagal memuat data. Buka lewat HTTP/HTTPS (GitHub Pages), bukan file://. '+err.message;}
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  const cfg=window.SCC_CONFIG||{};
  if(cfg.adminUrl){const el=$('#admin-link');el.href=cfg.adminUrl;el.hidden=false;}
  $('#category-select').addEventListener('change',e=>selectCategory(e.target.value));
  $('#filter-category').addEventListener('change',renderSchedule);
  $('#filter-round').addEventListener('change',renderSchedule);
  $('#schedule-search').addEventListener('input',renderSchedule);
  $('#sport-select').addEventListener('change',e=>selectSport(e.target.value));
  $('#print-bracket').addEventListener('click',()=>window.print());
  $('#print-schedule').addEventListener('click',()=>window.print());
  window.addEventListener('hashchange',switchPage);
  refresh();
  if(cfg.publicDataUrl && cfg.refreshSeconds>0)setInterval(refresh,Math.max(cfg.refreshSeconds,30)*1000);
});

