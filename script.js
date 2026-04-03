// 🚨 CLEAR ALL DATA EVERY TIME PAGE LOADS
localStorage.removeItem('coastaledu_v2'); 

/* ── State ── */
let records = JSON.parse(localStorage.getItem('coastaledu_v2') || '[]');
let GS_URL  = localStorage.getItem('coastaledu_gs') || '';
const scoreStore = { quiz:[null], assign:[null], perf:[null] };

/* ── Boot ── */
(function init() {
  buildScores('quiz'); buildScores('assign'); buildScores('perf');
  if (GS_URL) { document.getElementById('gsUrlInput').value = GS_URL; applyConnected(); }
})();

/* ── Setup ── */
function setupApp(local) {
  const url = document.getElementById('modalGsUrl').value.trim();
  const teacher = document.getElementById('modalTeacher').value.trim();
  if (!local && url) { GS_URL = url; localStorage.setItem('coastaledu_gs', url); }
  if (teacher) document.getElementById('teacherLabel').textContent = teacher;
  document.getElementById('setupModal').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  if (GS_URL) { applyConnected(); document.getElementById('gsUrlInput').value = GS_URL; }
  updateAll();
}

/* ── Navigation ── */
const pageMeta = {
  'overview':    { title:'Overview',       crumb:'Dashboard · Summary' },
  'add-student': { title:'Add Student',    crumb:'Records · New Entry' },
  'records':     { title:'All Records',    crumb:'Dashboard · Student List' },
  'sheets':      { title:'Sheets Setup',   crumb:'Settings · Google Integration' },
};
function navTo(id, btn) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const m = pageMeta[id] || {};
  document.getElementById('pageTitle').textContent = m.title || id;
  document.getElementById('pageBreadcrumb').textContent = m.crumb || '';
  if (id === 'records') renderTable();
  if (id === 'overview') renderOverview();
  document.getElementById('sheetsLocalCount').textContent = records.length;
}

/* ── Score rows ── */
function buildScores(cat) {
  const row = document.getElementById(cat+'-row');
  row.innerHTML = '';
  scoreStore[cat].forEach((v, i) => {
    const chip = document.createElement('div');
    chip.className = 'score-chip';
    chip.innerHTML = `<span>${cat.charAt(0).toUpperCase()+cat.slice(1)} ${i+1}</span>
      <input type="number" min="0" max="100" placeholder="—" value="${v ?? ''}"
        oninput="scoreStore['${cat}'][${i}]=+this.value||null; recalc('${cat}')"/>`;
    row.appendChild(chip);
  });
  if (scoreStore[cat].length < 10) {
    const btn = document.createElement('button');
    btn.className = 'add-chip-btn'; btn.title = 'Add score';
    btn.innerHTML = '+';
    btn.onclick = () => { scoreStore[cat].push(null); buildScores(cat); recalc(cat); };
    row.appendChild(btn);
  }
  recalc(cat);
}

function avg(arr) {
  const vals = arr.filter(v => v !== null && !isNaN(v) && v !== undefined);
  if (!vals.length) return null;
  return +(vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(2);
}

function recalc(cat) {
  const a = avg(scoreStore[cat]);
  const badge = document.getElementById(cat+'-avg-badge');
  badge.textContent = a !== null ? `Avg: ${a}` : 'Avg: —';
  updateScoreDisplay();
}

function updateScoreDisplay() {
  const qa = avg(scoreStore.quiz);
  const aa = avg(scoreStore.assign);
  const pa = avg(scoreStore.perf);
  document.getElementById('disp-quiz').textContent   = qa ?? '—';
  document.getElementById('disp-assign').textContent = aa ?? '—';
  document.getElementById('disp-perf').textContent   = pa ?? '—';
  const valids = [qa,aa,pa].filter(v=>v!==null);
  if (!valids.length) { document.getElementById('disp-overall').textContent='—'; return; }
  const overall = +(valids.reduce((s,v)=>s+v,0)/valids.length).toFixed(2);
  document.getElementById('disp-overall').textContent = overall;
}

/* ── Save ── */
function saveRecord() {
  const name = document.getElementById('f-name').value.trim();
  const sid  = document.getElementById('f-id').value.trim();
  if (!name||!sid) { toast('Please enter Name and Student ID.','err'); return; }
  const qa=avg(scoreStore.quiz), aa=avg(scoreStore.assign), pa=avg(scoreStore.perf);
  const valids=[qa,aa,pa].filter(v=>v!==null);
  if (!valids.length) { toast('Enter at least one score.','err'); return; }
  const overall=+(valids.reduce((s,v)=>s+v,0)/valids.length).toFixed(2);
  const r={
    id:Date.now(), name, studentId:sid,
    course:document.getElementById('f-course').value.trim(),
    email:document.getElementById('f-email').value.trim(),
    quizAvg:qa, assignAvg:aa, perfAvg:pa, overall,
    date:new Date().toLocaleDateString('en-PH'),
  };
  records.push(r);
  localStorage.setItem('coastaledu_v2', JSON.stringify(records));
  updateAll();
  toast(`✅ ${name}'s record saved successfully!`,'ok');
  resetForm();
  if (GS_URL) pushToSheets(r);
}

function resetForm() {
  ['f-name','f-id','f-course','f-email'].forEach(id=>document.getElementById(id).value='');
  scoreStore.quiz=[null]; scoreStore.assign=[null]; scoreStore.perf=[null];
  buildScores('quiz'); buildScores('assign'); buildScores('perf');
  updateScoreDisplay();
}

/* ── Update all widgets ── */
function updateAll() {
  document.getElementById('kpi-total').textContent = records.length;
  document.getElementById('sheetsLocalCount').textContent = records.length;
  if (!records.length) {
    ['kpi-avg','kpi-top'].forEach(id=>document.getElementById(id).textContent='—');
    renderTopList([]);
    return;
  }
  const avgs = records.map(r=>r.overall);
  document.getElementById('kpi-avg').textContent = (avgs.reduce((s,v)=>s+v,0)/avgs.length).toFixed(1);
  document.getElementById('kpi-top').textContent = Math.max(...avgs);
  const sorted = [...records].sort((a,b)=>b.overall-a.overall).slice(0,5);
  renderTopList(sorted);
}

function renderOverview() { updateAll(); }

function renderTopList(list) {
  const ranks=['🥇','🥈','🥉','4','5'];
  const rankClass=['gold','silver','bronze','',''];
  if (!list.length) {
    document.getElementById('topList').innerHTML=`<div class="empty-state" style="padding:28px 0;"><div style="font-size:36px;">🌊</div><p style="font-size:13px;margin-top:8px;">No records yet.</p></div>`;
    return;
  }
  document.getElementById('topList').innerHTML=list.map((r,i)=>`
    <div class="top-item">
      <div class="top-rank ${rankClass[i]}">${ranks[i]}</div>
      <div class="top-name">${r.name}</div>
      <div class="top-score">${r.overall}</div>
    </div>`).join('');
}

/* ── Records Table ── */
function renderTable() {
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase();
  const fs=document.getElementById('filterSection')?.value||'';
  const secSel=document.getElementById('filterSection');
  const secs=[...new Set(records.map(r=>r.course).filter(Boolean))];
  const prev=secSel.value;
  secSel.innerHTML='<option value="">All Sections</option>'+secs.map(s=>`<option ${s===prev?'selected':''}>${s}</option>`).join('');
  const filtered=records.filter(r=>
    (!q||r.name.toLowerCase().includes(q)||r.studentId.toLowerCase().includes(q))&&
    (!fs||r.course===fs)
  );
  const tbody=document.getElementById('tableBody');
  const empty=document.getElementById('emptyState');
  if(!filtered.length){tbody.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  const palette=['#1372aa','#28a462','#e8863a','#7c5cbf','#c0392b','#0891b2','#d97706'];
  tbody.innerHTML=filtered.map((r,i)=>{
    const col=palette[i%palette.length];
    const init=r.name.charAt(0).toUpperCase();
    const qa=r.quizAvg??'—', aa=r.assignAvg??'—', pa=r.perfAvg??'—';
    return `<tr>
      <td style="color:var(--text-muted);font-size:13px;font-weight:600;">${i+1}</td>
      <td><div class="student-cell">
        <div class="avatar" style="background:${col}18;color:${col};border-color:${col}30;">${init}</div>
        <div>
          <div class="student-name">${r.name}</div>
          <div class="student-email">${r.email||r.studentId}</div>
        </div>
      </div></td>
      <td style="color:var(--text-tertiary);font-size:13px;font-weight:500;">${r.studentId}</td>
      <td style="font-size:13px;color:var(--text-secondary);">${r.course||'—'}</td>
      <td><span class="score-tag" style="background:var(--ocean-pale);color:var(--ocean);">${qa}</span></td>
      <td><span class="score-tag" style="background:var(--palm-pale);color:var(--palm);">${aa}</span></td>
      <td><span class="score-tag" style="background:var(--sunset-pale);color:var(--sunset);">${pa}</span></td>
      <td style="font-size:12px;color:var(--text-muted);">${r.date||'—'}</td>
      <td><button class="act-btn" onclick="deleteRecord(${r.id})" title="Delete">🗑</button></td>
    </tr>`;
  }).join('');
}

function deleteRecord(id) {
  if(!confirm('Delete this student record?')) return;
  records=records.filter(r=>r.id!==id);
  localStorage.setItem('coastaledu_v2',JSON.stringify(records));
  updateAll(); renderTable();
  toast('Record deleted.','inf');
}

/* ── CSV ── */
function downloadCSV() {
  if(!records.length){toast('No records to export.','err');return;}
  const h=['Name','StudentID','Course','Email','QuizAvg','AssignAvg','PerfAvg','Overall','Date'];
  const rows=records.map(r=>[r.name,r.studentId,r.course,r.email,r.quizAvg,r.assignAvg,r.perfAvg,r.overall,r.date]);
  const csv=[h,...rows].map(r=>r.map(v=>`"${(v??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv,'+encodeURIComponent(csv);
  a.download='coastaledu_records.csv'; a.click();
  toast('CSV exported!','ok');
}

/* ── Google Sheets ── */
function connectSheets() {
  const url=document.getElementById('gsUrlInput').value.trim();
  if(!url){toast('Please enter a valid URL.','err');return;}
  GS_URL=url; localStorage.setItem('coastaledu_gs',url);
  applyConnected();
  toast('📊 Google Sheets connected!','ok');
}
function applyConnected() {
  document.getElementById('sideConnDot').className='conn-dot active';
  document.getElementById('sideConnStatus').textContent='Sheets Connected';
  document.getElementById('sideConnSub').textContent='Cloud sync enabled';
  document.getElementById('sheetsConnDot').className='conn-dot active';
  document.getElementById('sheetsConnStatus').textContent='Connected';
  document.getElementById('sheetsConnUrl').textContent=GS_URL.length>48?GS_URL.slice(0,48)+'…':GS_URL;
}
async function pushToSheets(record) {
  if(!GS_URL) return;
  try {
    await fetch(GS_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)});
    toast('☁ Synced to Sheets!','ok');
  } catch { toast('Sheets sync failed — saved locally.','err'); }
}
async function syncAll() {
  if(!GS_URL){toast('No Sheets URL configured. Go to Sheets Setup.','err');return;}
  if(!records.length){toast('No records to sync.','inf');return;}
  toast(`Syncing ${records.length} records…`,'inf');
  for(const r of records) await pushToSheets(r);
  toast(`✅ All records synced!`,'ok');
}
async function fetchFromSheets() {
  if(!GS_URL){toast('Connect Sheets first.','err');return;}
  try {
    toast('Fetching from Google Sheets…','inf');
    const res=await fetch(GS_URL);
    const data=await res.json();
    if(Array.isArray(data)&&data.length){
      records=data.map((r,i)=>({
        id:Date.now()+i,
        name:r.Name||r.name||'',
        studentId:r.StudentID||r.studentId||'',
        course:r.Course||r.course||'',
        email:r.Email||r.email||'',
        quizAvg:parseFloat(r.QuizAvg||r.quizAvg)||null,
        assignAvg:parseFloat(r.AssignAvg||r.assignAvg)||null,
        perfAvg:parseFloat(r.PerfAvg||r.perfAvg)||null,
        overall:parseFloat(r.Overall||r.overall)||0,
        date:r.Timestamp||r.date||'',
      })).filter(r=>r.name);
      localStorage.setItem('coastaledu_v2',JSON.stringify(records));
      updateAll(); renderTable();
      toast(`✅ ${records.length} records loaded from Sheets!`,'ok');
    } else { toast('No data found in sheet.','inf'); }
  } catch(e) { toast('Failed to fetch. Check your URL.','err'); }
}

/* ── Toast ── */
function toast(msg,type='inf') {
  const el=document.createElement('div');
  el.className='toast '+type;
  el.innerHTML=`<span>${msg}</span>`;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(()=>el.remove(),4000);
}
/* ── Auth UI logic ── */
let selectedRole = 'teacher';

function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  document.getElementById('form-login').classList.toggle('active', tab==='login');
  document.getElementById('form-register').classList.toggle('active', tab==='register');
  clearAuthMsgs();
}

function showAuthMsg(formId, msg, type) {
  const el = document.getElementById(formId+'-msg');
  el.className = 'auth-msg '+type;
  el.innerHTML = (type==='err'?'⚠️ ':'✅ ') + msg;
}
function clearAuthMsgs() {
  ['login-msg','register-msg'].forEach(id => {
    const el = document.getElementById(id);
    el.className = 'auth-msg';
    el.textContent = '';
  });
}

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁' : '🙈';
}

function selectRole(pill) {
  document.querySelectorAll('.role-pill').forEach(p => p.classList.remove('selected'));
  pill.classList.add('selected');
  selectedRole = pill.dataset.role;
}

function checkStrength(pw) {
  const wrap = document.getElementById('pw-strength');
  const fill = document.getElementById('strength-fill');
  const lbl  = document.getElementById('strength-label');
  wrap.classList.toggle('show', pw.length > 0);
  if (!pw) return;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { pct:'20%', color:'#ef4444', label:'Too weak'  },
    { pct:'45%', color:'#f97316', label:'Weak'      },
    { pct:'65%', color:'#eab308', label:'Fair'      },
    { pct:'85%', color:'#22c55e', label:'Strong'    },
    { pct:'100%',color:'#16a34a', label:'Very strong'},
  ];
  const l = levels[score] || levels[0];
  fill.style.width = l.pct;
  fill.style.background = l.color;
  lbl.textContent = l.label;
  lbl.style.color = l.color;
}

function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const teacher  = document.getElementById('login-teacher').value.trim();
  const gsurl    = document.getElementById('login-gsurl').value.trim();

  if (!email) { showAuthMsg('login','Please enter your email address.','err'); return; }
  if (!password) { showAuthMsg('login','Please enter your password.','err'); return; }
  if (password.length < 6) { showAuthMsg('login','Password must be at least 6 characters.','err'); return; }

  // Simulate login (no real backend)
  launchApp(teacher || email.split('@')[0], gsurl);
}

function doRegister() {
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName  = document.getElementById('reg-lastname').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const school    = document.getElementById('reg-school').value.trim();
  const password  = document.getElementById('reg-password').value;
  const confirm   = document.getElementById('reg-confirm').value;

  if (!firstName || !lastName) { showAuthMsg('register','Please enter your full name.','err'); return; }
  if (!email || !email.includes('@')) { showAuthMsg('register','Please enter a valid email address.','err'); return; }
  if (password.length < 6) { showAuthMsg('register','Password must be at least 6 characters.','err'); return; }
  if (password !== confirm)  { showAuthMsg('register','Passwords do not match.','err'); return; }

  const displayName = `${firstName} ${lastName}${school ? ' — ' + school : ''}`;
  showAuthMsg('register', 'Account created! Launching dashboard…', 'ok');
  setTimeout(() => launchApp(displayName, ''), 900);
}

function forgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showAuthMsg('login','Enter your email above first.','err'); return; }
  showAuthMsg('login', `Password reset link sent to ${email} (demo only).`, 'ok');
}

function launchApp(teacherName, gsurl) {
  if (teacherName) document.getElementById('teacherLabel').textContent = teacherName;
  if (gsurl) {
    GS_URL = gsurl;
    localStorage.setItem('coastaledu_gs', gsurl);
    document.getElementById('gsUrlInput').value = gsurl;
    applyConnected();
  }
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  updateAll();
}
function doLogout() {
  if (!confirm('Log out of CoastalEdu?')) return;
  localStorage.removeItem('coastaledu_gs');
  GS_URL = '';
  records = [];
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-teacher').value = '';
  document.getElementById('login-gsurl').value = '';
  switchTab('login');
}