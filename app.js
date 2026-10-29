
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
  senam:{name:'Senam', icon:'🤸', blurb:'Urutan penampilan, jadwal, dan nilai peserta mengikuti data yang diisi panitia.'}
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
  document.body.dataset.page=current;
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
  const scheduleCategory=$('#filter-category').value;
  const live=championship.categories.filter(c=>c.format==='knockout');
  $('#stat-teams').textContent=championship.categories.reduce((sum,c)=>sum+c.teams.length,0);
  $('#stat-matches').textContent=championship.categories.reduce((sum,c)=>sum+c.matches.length+(c.performances||[]).length,0);
  $('#stat-done').textContent=live.reduce((sum,c)=>sum+c.matches.filter(m=>resolveOutcome(c,m).winner).length,0);
  const sports=[{name:'Hadang',emoji:'🏃',desc:'Putra 9 tim dan Putri 9 tim • Lapangan berbeda',id:'hadang'},
  {name:'Bola Voli',emoji:'🏐',desc:'Putra 15 tim dan Putri 10 tim • Menang 2 set',id:'voli'},
  {name:'Senam',emoji:'🤸',desc:'7 tim • Jadwal penampilan • Nilai juri belum tersedia',id:'senam'}];
  $('#sport-grid').innerHTML=sports.map(s=>{
    const cats=championship.categories.filter(c=>c.sport===s.name);
    s.desc=cats.map(c=>c.format==='judging'?c.teams.length+' peserta • Jadwal dan penilaian':c.division+' '+c.teams.length+' tim').join(' · ');
    return `<div class="sport-card"><div class="sport-top"><div><div class="eyebrow" style="color:#e7f0fb">CABANG OLAHRAGA</div><div class="sport-name">${esc(s.name)}</div></div><span class="sport-emoji">${s.emoji}</span></div><div class="sport-card-content"><p>${esc(s.desc)}</p><a class="sport-detail-link" href="#cabang/${esc(s.id)}">Informasi cabang →</a><div class="category-buttons">${cats.map(c=>c.format==='judging'?`<a href="#cabang/senam" class="category-btn">${c.teams.length} peserta • Jadwal tampil</a>`:`<button type="button" class="category-btn" data-cat="${esc(c.id)}">${esc(c.division)} • ${c.teams.length} tim</button>`).join('')}</div></div></div>`;
  }).join('');
  document.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>selectCategory(b.dataset.cat)));
  $('#home-summary').innerHTML=[...live.map(c=>`<div class="summary-box"><h3>${esc(c.sport)} • ${esc(c.division)}</h3><strong>${c.matches.filter(m=>resolveOutcome(c,m).winner).length} / ${c.matches.length}</strong><p>Pertandingan selesai</p></div>`),...championship.categories.filter(c=>c.format==='judging').map(c=>`<div class="summary-box"><h3>🤸 Senam</h3><strong>${c.teams.length} peserta</strong><p>${(c.performances||[]).filter(x=>x.score!==null&&x.score!==undefined).length} penilaian tercatat</p></div>`)].join('');
  $('#category-select').innerHTML=live.map(c=>`<option value="${esc(c.id)}">${esc(c.sport)} • ${esc(c.division)} (${c.teams.length} tim)</option>`).join('');
  $('#filter-category').innerHTML='<option value="all">Semua cabang</option>'+championship.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.sport)}${c.format==='judging'?'':` • ${esc(c.division)}`}</option>`).join('');
  if([...$('#filter-category').options].some(o=>o.value===scheduleCategory))$('#filter-category').value=scheduleCategory;
  switchPage();
}
function bracketLayout(cat){
  const centers={};let cursor=112;
  for(const q of cat.matches.filter(m=>m.code.startsWith('QF-')).sort((a,b)=>a.code.localeCompare(b.code))){
    const prelim=[q.a,q.b].filter(r=>r?.match?.startsWith('P-'));
    const height=Math.max(1,prelim.length)*166;
    centers[q.code]=cursor+height/2;
    prelim.forEach((r,i)=>centers[r.match]=cursor+83+i*166);
    cursor+=height+18;
  }
  for(const m of cat.matches.filter(m=>m.code.startsWith('SF-'))){
    centers[m.code]=([m.a,m.b].reduce((sum,r)=>sum+(centers[r.match]||112),0))/2;
  }
  centers.FINAL=((centers['SF-1']||200)+(centers['SF-2']||500))/2;
  centers.J3=centers.FINAL+246;
  return {centers,height:Math.max(cursor+30,centers.J3+110)};
}
function bracketX(code){return code.startsWith('P-')?24:code.startsWith('QF-')?308:code.startsWith('SF-')?592:876;}
function teamMark(name){const words=String(name).replace(/^ranting\s+/i,'').split(/\s+/);return words.map(w=>w[0]).slice(0,2).join('').toUpperCase()||'–';}
function scoreText(value){return value===null||value===undefined?'—':new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(value);}
function awardCard(rank,name,detail=''){
  return `<div class="champion-item rank-${rank} ${name?'is-decided':'is-pending'}"><span class="award-medal" aria-hidden="true">${['','🥇','🥈','🥉'][rank]}</span><div><b>JUARA ${rank}</b><strong>${esc(name||'Menunggu hasil')}</strong><small>${esc(detail||(name?'Hasil pertandingan':'Belum ditentukan panitia'))}</small></div></div>`;
}
function renderBracket(){
  const cat=categoryById(selectedCategory);if(!cat||!cat.matches.length)return;
  $('#category-select').value=cat.id;
  const {centers,height}=bracketLayout(cat),width=1140;
  const matches=cat.matches.map(m=>({...m,y:centers[m.code]||150}));
  const finished=matches.filter(m=>matchDisplay(cat,m).winner).length;
  let lines='';
  for(const m of matches)for(const ref of [m.a,m.b]){
    if(!ref?.match)continue;const from=matches.find(p=>p.code===ref.match);if(!from)continue;
    const x1=bracketX(from.code)+240,x2=bracketX(m.code),mid=x1+(x2-x1)/2;
    const bronze=ref.outcome==='loser';
    const d=from.y===m.y?`M${x1} ${from.y} H${x2}`:`M${x1} ${from.y} H${mid} Q${mid+5} ${from.y} ${mid+5} ${from.y+(m.y>=from.y?5:-5)} V${m.y+(m.y>=from.y?-5:5)} Q${mid+5} ${m.y} ${mid+10} ${m.y} H${x2}`;
    lines+=`<path d="${d}" fill="none" stroke="${bronze?'#bd9b79':matchDisplay(cat,from).winner?'#4c967c':'#cbd8d2'}" stroke-width="2" ${bronze?'stroke-dasharray="5 6"':''}/>`;
  }
  const labels=[['01','Pendahuluan',24],['02','Perempat final',308],['03','Semifinal',592],['04','Final & juara 3',876]];
  const cards=matches.map(m=>{
    const v=matchDisplay(cat,m),done=!!v.winner,playing=!done&&m.setScores?.length>0;
    const entry=(t,score)=>`<div class="participant ${t.pending?'pending':''} ${done&&v.winner===t.id?'winner':''}"><span class="team-avatar" aria-hidden="true">${t.pending?'·':esc(teamMark(t.name))}</span><span class="team" title="${esc(t.name)}">${esc(t.name)}</span><span class="score">${scoreText(score)}</span>${done&&v.winner===t.id?'<span class="winner-check" aria-label="Pemenang">✓</span>':''}</div>`;
    const sets=m.setScores?.length?m.setScores.map((s,i)=>`<span>S${i+1} <b>${esc(s[0])}–${esc(s[1])}</b></span>`).join(''):`<span>${esc(m.start||'Jam belum diatur')}${m.venue?' · '+esc(m.venue):''}</span>`;
    return `<article class="match-card ${m.code==='FINAL'?'final':''} ${m.code==='J3'?'bronze':''} ${done?'is-complete':''}" style="left:${bracketX(m.code)}px;top:${m.y-72}px" aria-label="${esc(cat.sport+' '+cat.division+' '+m.code)}"><div class="match-title"><span>${esc(m.code==='FINAL'?'🏆 FINAL':m.code==='J3'?'🥉 JUARA 3':m.code)}</span><span class="match-state ${done?'complete':playing?'playing':''}">${done?'Selesai':playing?'Dalam proses':'Terjadwal'}</span></div>${entry(v.a,m.scoreA)}${entry(v.b,m.scoreB)}<div class="match-set-summary">${sets}</div></article>`;
  }).join('');
  $('#bracket').style.height=height+'px';
  $('#bracket').innerHTML=`<svg class="tree-lines" viewBox="0 0 ${width} ${height}" style="height:${height}px" aria-hidden="true">${lines}</svg>${labels.map(([n,label,x])=>`<div class="bracket-label" style="left:${x}px"><span>${n}</span>${label}</div>`).join('')}${cards}`;
  $('#bracket-caption').innerHTML=`<span class="category-kicker">${esc(cat.sport)} / ${esc(cat.division)}</span><strong>${cat.teams.length} tim <span>·</span> ${matches.length} pertandingan</strong><span class="bracket-progress">${finished} dari ${matches.length} selesai</span>`;
  const f=resolveOutcome(cat,lookupMatch(cat,'FINAL')),b=resolveOutcome(cat,lookupMatch(cat,'J3'));
  $('#champions').innerHTML=[f.winner,f.loser,b.winner].map((id,i)=>awardCard(i+1,id?teamName(cat,id):null,i===2?'Perebutan juara 3':'Babak final')).join('');
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
    const scored=judging&&Number.isFinite(m.score),playing=!judging&&!v.winner&&m.setScores?.length>0;
    const status=judging?(scored?'Sudah dinilai':'Menunggu nilai'):(v.winner?'Selesai':playing?'Dalam proses':'Terjadwal');
    const score=judging?`<span class="score-unit">NILAI</span><strong>${scoreText(m.score)}</strong>`:`<strong>${scoreText(m.scoreA)}</strong><span class="score-divider">:</span><strong>${scoreText(m.scoreB)}</strong>`;
    const sets=!judging&&m.setScores?.length?`<div class="table-sets">${m.setScores.map((s,j)=>`<span>S${j+1} <b>${esc(s[0])}–${esc(s[1])}</b></span>`).join('')}</div>`:'';
    return `<tr class="schedule-entry ${judging?'is-judging':''} ${v.winner?'is-complete':''}"><td><span class="row-number">${String(i+1).padStart(2,'0')}</span></td><td><span class="sport-tag ${cat.id.startsWith('voli')?'sport-voli':judging?'sport-senam':'sport-hadang'}">${esc(cat.sport)}</span><small class="division-label">${esc(cat.division)}</small></td><td><span class="round-name">${judging?'Penampilan':esc(m.round.toLowerCase())}</span><small class="match-code">${esc(m.code)}</small></td><td><span class="schedule-team">${esc(v.a.name)}</span>${judging&&m.notes?`<small class="team-note">${esc(m.notes)}</small>`:''}</td><td class="score-inline"><div class="table-score">${score}</div>${sets}</td><td><span class="schedule-team">${esc(v.b.name)}</span></td><td><span class="schedule-time">${esc(m.start||'—')} <span>–</span> ${esc(m.end||'—')}</span><small class="day-label">${esc(m.date?fmtDate(m.date):(m.dayLabel||'Hari belum ditentukan'))}</small></td><td><span class="venue-label">${esc(m.venue||'—')}</span></td><td><span class="pill ${v.winner?'complete':playing?'playing':''}">${status}</span></td></tr>`;
  }).join('')||'<tr class="empty-row"><td colspan="9"><strong>Tidak ada pertandingan yang cocok</strong><p>Coba pilih cabang lain atau ubah kata pencarian.</p></td></tr>';

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
      const records=(cat.performances||[]).filter(x=>Number.isFinite(x.score)),allDone=records.length===cat.teams.length&&records.length>0;
      const sorted=records.slice().sort((a,b)=>b.score-a.score);
      return `<article class="result-card result-senam"><div class="result-heading"><span class="result-icon" aria-hidden="true">🤸</span><div><span class="category-kicker">PENILAIAN JURI</span><h3>Senam</h3></div><span class="pill ${allDone?'complete':''}">${records.length} / ${cat.teams.length} dinilai</span></div><div class="result-progress"><span style="width:${cat.teams.length?records.length/cat.teams.length*100:0}%"></span></div>${allDone?`<div class="result-awards">${sorted.slice(0,3).map((x,i)=>awardCard(i+1,teamName(cat,x.teamId),'Nilai total '+scoreText(x.score))).join('')}</div>`:'<div class="result-empty"><span aria-hidden="true">✧</span><strong>Menunggu penilaian lengkap</strong><p>Peringkat akan tampil setelah seluruh peserta memiliki nilai.</p></div>'}<div class="judging-list">${(cat.performances||[]).map(x=>`<div><span class="senam-seq">${String(x.order).padStart(2,'0')}</span><span>${esc(teamName(cat,x.teamId))}</span><b class="judging-value ${Number.isFinite(x.score)?'is-scored':''}">${scoreText(x.score)}</b></div>`).join('')}</div></article>`;
    }
    const f=resolveOutcome(cat,lookupMatch(cat,'FINAL')),b=resolveOutcome(cat,lookupMatch(cat,'J3')),done=cat.matches.filter(m=>resolveOutcome(cat,m).winner).length;
    return `<article class="result-card"><div class="result-heading"><span class="result-icon" aria-hidden="true">${cat.sport==='Hadang'?'🏃':'🏐'}</span><div><span class="category-kicker">${esc(cat.division)}</span><h3>${esc(cat.sport)}</h3></div><span class="pill ${f.winner?'complete':''}">${f.winner?'Final selesai':done+' / '+cat.matches.length+' laga'}</span></div><div class="result-progress"><span style="width:${done/cat.matches.length*100}%"></span></div><div class="result-awards">${[f.winner,f.loser,b.winner].map((id,i)=>awardCard(i+1,id?teamName(cat,id):null,i===2?'Perebutan juara 3':'Babak final')).join('')}</div><a class="result-link" href="#bagan/${esc(cat.id)}">Lihat perjalanan pertandingan <span aria-hidden="true">↗</span></a></article>`;
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
  if(state.refreshing)return;
  state.refreshing=true;
  try{
    if(window.SCC_CONFIG?.publicDataUrl){const live=await remoteData(window.SCC_CONFIG.publicDataUrl);if(!live || !Array.isArray(live.categories) || !live.categories.length || live.categories.some(c=>!Array.isArray(c.teams)||!Array.isArray(c.matches)))throw new Error("Struktur data backend tidak valid");championship=live;state.fallback=false;}
    else if(window.SCC_SEED){championship=window.SCC_SEED;state.fallback=true;}
    else{const res=await fetch('data/seed.json',{cache:'no-store'});if(!res.ok)throw new Error('File data tidak bisa dibaca');championship=await res.json();state.fallback=true;}
    const source=state.fallback?'Pratinjau dari TUANABU.xlsx (29 Oktober 2026): belum tersambung ke Google Sheets, tidak diperbarui langsung.':(championship.source==='original_sheets'?'Tersambung langsung: data dibaca dari Google Sheets TUANABU.':'Tersambung: data dibaca dari Google Sheets melalui Apps Script.')+(championship.warnings?.length?' '+championship.warnings.join(' '):'');
    $('#source-notice').textContent=source;
    $('#source-notice').dataset.mode=state.fallback?'fallback':'live';
    $('#last-update').textContent=state.fallback?'Impor TUANABU.xlsx':`Pembaruan ${new Date().toLocaleTimeString('id-ID')}`;
    renderMain();
  }catch(err){
    console.warn('PGRI live data unavailable:',err.name,err.message);
    // When live backend is unreachable, do not pretend this is current data.
    try{const res=await fetch('data/seed.json');championship=await res.json();state.fallback=true;renderMain();$('#last-update').textContent='Salinan TUANABU.xlsx — belum sinkron';$('#source-notice').dataset.mode='fallback';$('#source-notice').textContent='⚠ Backend tidak tersedia. Data yang tampil adalah salinan awal dari Excel, bukan hasil pertandingan terbaru.';}
    catch(_){$('#source-notice').textContent='Gagal memuat data. Buka lewat HTTP/HTTPS (GitHub Pages), bukan file://. '+err.message;}
  }finally{state.refreshing=false;}
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
  if(cfg.publicDataUrl && cfg.refreshSeconds>0)setInterval(refresh,Math.max(cfg.refreshSeconds,10)*1000);
});
