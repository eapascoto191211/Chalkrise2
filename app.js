// helpers
const $  = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));
const esc = s => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* pointer mode */
const isCoarse = matchMedia('(pointer:coarse)').matches;

/* ===== WebAudio SFX (leves) ===== */
const SFX = (() => {
  let AC=null, master=null;
  function ensure() {
    if (!AC) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      AC = new Ctx();
      master = AC.createGain();
      master.gain.value = 0.16;
      master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return true;
  }
  const now = () => (ensure(), AC ? AC.currentTime : 0);
  function env(g,a=.005,r=.12,peak=1){ if(!g||!g.gain||!AC) return; const t=now(); g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(.0001,t+a+r); }
  function osc(type='sine', f=440){ const o=AC.createOscillator(); o.type=type; o.frequency.value=f; const g=AC.createGain(); g.gain.value=.0001; o.connect(g).connect(master); o.start(); return {o,g}; }
  function noise(){ const b=AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*.9; const s=AC.createBufferSource(); s.buffer=b; const g=AC.createGain(); g.gain.value=.0001; s.connect(g).connect(master); s.start(); return {s,g}; }
  function tap(){ if(!ensure())return; const {o,g}=osc('triangle',420); env(g,.002,.06,.5); o.stop(AC.currentTime+.12); }
  function blip(){ if(!ensure())return; const {o,g}=osc('sine',650); env(g,.006,.16,.7); o.frequency.exponentialRampToValueAtTime(740, AC.currentTime+.12); o.stop(AC.currentTime+.22); }
  function pop(){ if(!ensure())return; const {o,g}=osc('sine',180); env(g,.004,.16,.65); o.frequency.exponentialRampToValueAtTime(260, AC.currentTime+.08); o.stop(AC.currentTime+.2); }
  function woosh(){ if(!ensure())return; const n=noise(); const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=280; bp.Q.value=.7; n.g.disconnect(); n.g.connect(bp).connect(master); env(n.g,.005,.24,.7); const t=now(); bp.frequency.linearRampToValueAtTime(1100, t+.24); }
  function resume(){ ensure(); }
  return {tap, blip, pop, woosh, resume};
})();

/* header date */
(() => {
  const el = $('#today'); if(!el) return;
  el.textContent = new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
})();

/* theme (dark default) */
(() => {
  const root=document.documentElement, fx=$('#themeFx');
  apply(localStorage.getItem('theme')||'dark', false);
  bind('#btnThemeLogin','#themeLabelLogin','#icSunLogin','#icMoonLogin');
  bind('#btnTheme','#themeLabel','#icSun','#icMoon');

  function bind(btnSel,labelSel,sunSel,moonSel){
    const btn=$(btnSel); if(!btn) return;
    const label=$(labelSel), sun=$(sunSel), moon=$(moonSel);
    reflect(root.dataset.theme);
    btn.addEventListener('click', ()=>{
      const next=root.dataset.theme==='dark'?'light':'dark';
      apply(next,true); reflect(next); SFX.pop();
    },{passive:true});
    function reflect(mode){
      if(label) label.textContent=`Tema: ${mode==='dark'?'Escuro':'Claro'}`;
      if(sun&&moon){ const showSun=mode==='light'; sun.classList.toggle('hidden',!showSun); moon.classList.toggle('hidden',showSun); }
    }
  }
  function apply(mode, anim){ root.dataset.theme=mode; localStorage.setItem('theme',mode); if(anim){fx.classList.add('on'); setTimeout(()=>fx.classList.remove('on'),280);} dispatchEvent(new CustomEvent('themechange',{detail:{mode}})); }
})();

/* ===== partículas com auto-throttle por FPS ===== */
(() => {
  const cv=$('#stars'); if(!cv) return; const ctx=cv.getContext('2d',{alpha:true});
  let W=0,H=0,P=[],topc,botc,fill,halo, frame=0;
  let frames=0, last=performance.now(), slow=0; // auto-throttle
  function pal(){const cs=getComputedStyle(document.documentElement); topc=cs.getPropertyValue('--sky-top').trim(); botc=cs.getPropertyValue('--sky-bot').trim(); fill=cs.getPropertyValue('--star-fill').trim(); halo=cs.getPropertyValue('--star-halo').trim();}
  pal(); addEventListener('themechange',pal);
  function resize(){W=cv.width=innerWidth; H=cv.height=innerHeight; const density=isCoarse?10000:14000; const n=Math.min(200,Math.floor(W*H/density)); P=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+.4,vx:(Math.random()-.5)*.18,vy:-(Math.random()*.5+.08)}));}
  addEventListener('resize',resize,{passive:true}); resize();
  function drawStars(){
    ctx.clearRect(0,0,W,H);
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,topc); g.addColorStop(1,botc);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.y<-10){p.y=H+10;p.x=Math.random()*W}
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,p.r*2,0,Math.PI*2);ctx.strokeStyle=halo;ctx.stroke();});
  }
  (function tick(){
    frames++;
    const now=performance.now();
    if(now-last>1000){
      const fps=frames*1000/(now-last);
      frames=0; last=now;
      slow = fps<45 ? Math.min(2, slow+1) : Math.max(0, slow-1);
    }
    // pula frames conforme "slow"
    if(!slow || frame% (slow+1)===0) drawStars();
    frame++;
    requestAnimationFrame(tick);
  })();
})();

/* ===== login ===== */
(() => {
  const screen=$('#screen-login'), app=$('#app');
  $('#btnSkip')?.addEventListener('click',()=>{ goHome(); SFX.pop(); },{passive:true});
  $('#btnLogin')?.addEventListener('click',e=>{e.preventDefault(); goHome(); SFX.pop();});
  $('#btnGoLogin')?.addEventListener('click',()=>{app.classList.add('hidden'); screen.classList.remove('hidden'); window.scrollTo({top:0,behavior:'instant'}); SFX.woosh();},{passive:true});
  function goHome(){screen.classList.add('hidden'); app.classList.remove('hidden');}
})();

/* ===== Modal “nasce do botão” (mobile) ===== */
const Modal = (() => {
  const wrap = $('#appModal'); if(!wrap) return null;
  const title = $('#modalTitle'), body = $('#modalBody'), actions = $('#modalActions');
  const card  = wrap.querySelector('.modal-card');
  $('#modalClose').addEventListener('click', close);
  wrap.querySelector('.modal-backdrop').addEventListener('click', close);

  function open({title:t, html, buttons=[], anchor=null}){
    title.textContent = t || '—';
    body.innerHTML = html || '';
    actions.innerHTML = '';
    buttons.forEach(b=>{
      const el = document.createElement('button');
      el.className = `modal-btn ${b.variant||''}`.trim();
      el.textContent = b.label;
      el.addEventListener('click', ()=>b.onClick?.(close), {passive:true});
      actions.appendChild(el);
    });

    if (isCoarse && anchor) {
      const r = anchor.getBoundingClientRect();
      card.style.setProperty('--origin-x', `${r.left + r.width/2}px`);
      card.style.setProperty('--origin-y', `${r.top  + r.height/2}px`);
    } else {
      card.style.removeProperty('--origin-x'); card.style.removeProperty('--origin-y');
    }

    wrap.classList.remove('hidden');
    requestAnimationFrame(()=>{ wrap.classList.add('show'); setTimeout(()=>{ wrap.querySelector('input,textarea,button')?.focus(); }, 10); });
    SFX.pop();
  }
  function close(){ wrap.classList.remove('show'); setTimeout(()=>wrap.classList.add('hidden'), isCoarse?220:0); }
  return { open, close, el:wrap };
})();

/* ===== Ripple (só mobile) ===== */
(() => {
  if(!isCoarse) return;
  const selector = '.cta-btn,.dock-btn,.chip,.btn-primary,.btn-ghost,.composer button';
  document.addEventListener('pointerdown', e=>{
    const btn = e.target.closest(selector); if(!btn) return;
    SFX.resume(); SFX.tap();
    const r = document.createElement('span'); r.className='ripple';
    const rect = btn.getBoundingClientRect(); const d = Math.max(rect.width, rect.height);
    r.style.width=r.style.height=d+'px'; r.style.left=(e.clientX-rect.left-d/2)+'px'; r.style.top=(e.clientY-rect.top-d/2)+'px';
    btn.appendChild(r); setTimeout(()=>r.remove(), 520);
  }, {passive:true});
})();

/* ===== Tabs + swipe (já leve) ===== */
(() => {
  const dock = $('#dock'); const btns = $$('.dock-btn', dock);
  const tabs = ['#tab-home','#tab-classroom','#tab-chat'];
  let current = 0, navLock = false; const NAV_MS = isCoarse ? 360 : 180;

  function vibrate(ms=12){ if(isCoarse && navigator.vibrate) navigator.vibrate(ms); }
  function toast(text){ if(!isCoarse) return; const t=$('#toast'); if(!t) return; t.textContent=text; t.classList.remove('hidden'); requestAnimationFrame(()=>t.classList.add('show')); setTimeout(()=>{t.classList.remove('show'); setTimeout(()=>t.classList.add('hidden'),240);},800); }
  const clearAnim = el => el?.classList.remove('slide-in-right','slide-in-left','fade-out');

  function activate(idx, dir='right'){
    if(idx===current || idx<0 || idx>=tabs.length || navLock) return;
    navLock = true;
    const old=$(tabs[current]), next=$(tabs[idx]);
    clearAnim(old); clearAnim(next);
    if(isCoarse){ old&&old.classList.add('fade-out'); next&&next.classList.add('active', dir==='right'?'slide-in-right':'slide-in-left'); }
    else { next&&next.classList.add('active'); old&&old.classList.remove('active'); }
    btns.forEach((b,i)=>{ const on=i===idx; b.classList.toggle('active',on); b.setAttribute('aria-selected',on?'true':'false'); if(isCoarse&&on){b.classList.add('pulse'); setTimeout(()=>b.classList.remove('pulse'),380);} });
    vibrate(10); SFX.woosh(); toast(btns[idx].textContent.trim());
    setTimeout(()=>{ old&&old.classList.remove('active','fade-out'); if(isCoarse) next&&next.classList.remove('slide-in-right','slide-in-left'); current=idx; window.scrollTo({top:0,behavior:isCoarse?'smooth':'auto'}); navLock=false; }, NAV_MS);
  }

  dock.addEventListener('click', e=>{
    const btn = e.target.closest('.dock-btn'); if(!btn) return;
    const idx = Number(btn.dataset.index ?? btns.indexOf(btn));
    activate(idx, idx>current?'right':'left');
  }, {passive:true});

  if(isCoarse){
    let sx=0, sy=0, dx=0, dy=0, tracking=false, startT=0;
    const page=$('#page');
    page.addEventListener('touchstart',e=>{const t=e.touches[0]; tracking=true;sx=t.clientX;sy=t.clientY;dx=dy=0;startT=performance.now();},{passive:true});
    page.addEventListener('touchmove', e=>{if(!tracking)return;const t=e.touches[0];dx=t.clientX-sx;dy=t.clientY-sy; if(Math.abs(dx)>Math.abs(dy)*1.25) e.preventDefault();},{passive:false});
    page.addEventListener('touchend',  ()=>{if(!tracking)return;tracking=false;const dt=performance.now()-startT;const TH=64, FAST=.36;const v=Math.abs(dx)/Math.max(dt,1); if(Math.abs(dx)>TH||v>FAST){ activate(dx<0?current+1:current-1, dx<0?'right':'left'); }},{passive:true});
  }
})();

/* ===== UX helpers ===== */
function avatarHue(str){ let h=0; for(const c of str) h=(h*31 + c.charCodeAt(0))%360; return h; }
function paintAvatars(){ $$('.avatar').forEach(av=>{ const name=(av.textContent||'').trim(); if(!name) return; const h=avatarHue(name); av.style.background=`conic-gradient(from 0deg, hsl(${h} 90% 60%), hsl(${(h+60)%360} 90% 60%))`; }); }
paintAvatars();

/* ===== IntersectionObserver para “hidratar” widgets só quando visíveis ===== */
(() => {
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        if(e.target.id==='newsList') hydrateNews();
        if(e.target.id==='taskList') hydrateTasks();
        e.target.dataset.ready = 1; io.unobserve(e.target);
      }
    });
  },{rootMargin:'200px'});

  ['newsList','taskList'].forEach(id=>{ const el=$('#'+id); if(el) io.observe(el); });

  function hydrateNews(){ /* já montamos dinamicamente no bloco HOME */ }
  function hydrateTasks(){ /* idem */ }
})();

/* ===== HOME (com modais ancorados) ===== */
(() => {
  const news = [
    { id:1, title:'Semana da Ciência', when:'Hoje • 10:00', desc:'Abertura no auditório. Tragam garrafinha d’água.' },
    { id:2, title:'Plantão de Dúvidas — Matemática', when:'Amanhã • 13:30', desc:'Revisão de função quadrática.' },
    { id:3, title:'Biblioteca em manutenção', when:'Sex • Dia todo', desc:'Somente devoluções no balcão externo.' },
  ];
  const tasks = [
    { id:11, title:'Redação — Tema livre', due:'23/09', subject:'Português', done:false },
    { id:12, title:'Lista 4 — Funções', due:'21/09', subject:'Matemática', done:false },
    { id:13, title:'Mapa — Bacias brasileiras', due:'25/09', subject:'Geografia', done:true },
  ];

  const newsList = $('#newsList');
  if(newsList){
    newsList.innerHTML = news.map(n=>`
      <li class="list-item pop">
        <div>
          <div class="title">${esc(n.title)}</div>
          <div class="meta">${esc(n.when)}</div>
          <div class="meta">${esc(n.desc)}</div>
        </div>
        <div class="actions"><button class="chip" data-open-news="${n.id}">Abrir</button></div>
      </li>`).join('');
  }
  $('#btnAllNews')?.addEventListener('click',e=>{
    Modal.open({
      title:'Todos os comunicados',
      html: news.map(n=>`<div class="list-item"><div><div class="title">${esc(n.title)}</div><div class="meta">${esc(n.when)}</div><div class="meta">${esc(n.desc)}</div></div></div>`).join(''),
      buttons:[{label:'Fechar', onClick:(c)=>c()}],
      anchor:e.currentTarget
    });
  });
  newsList?.addEventListener('click',e=>{
    const id = e.target?.dataset?.openNews; if(!id) return;
    const n = news.find(x=>String(x.id)===String(id)); if(!n) return;
    Modal.open({
      title:n.title,
      html:`<p class="meta">${esc(n.when)}</p><p style="margin-top:6px">${esc(n.desc)}</p>`,
      buttons:[{label:'Fechar', onClick:(c)=>c()}],
      anchor:e.target
    });
  });

  const KEY='chalkrise_tasks_student';
  let state = load() || tasks;
  const tList = $('#taskList'); render();

  $('#btnAllTasks')?.addEventListener('click',e=>{
    Modal.open({
      title:'Minhas atividades',
      html: state.map(t=>`
        <div class="list-item">
          <div>
            <div class="title">${esc(t.title)}</div>
            <div class="meta">${esc(t.subject)} • entrega ${esc(t.due)}</div>
          </div>
          <div class="actions">
            <button class="chip" data-toggle-task="${t.id}">${t.done?'Desmarcar':'Marcar entregue'}</button>
          </div>
        </div>`).join(''),
      buttons:[{label:'Fechar', onClick:(c)=>c()}],
      anchor:e.currentTarget
    });
    $('#modalBody').addEventListener('click',ev=>{
      const id=ev.target?.dataset?.toggleTask; if(!id) return;
      toggle(Number(id)); render();
      $('#modalClose').click(); $('#btnAllTasks').click();
    },{once:true});
  });

  tList?.addEventListener('click',e=>{
    const id=e.target?.dataset?.toggleTask; if(!id) return;
    toggle(Number(id)); render();
  });

  function render(){
    if(!tList) return;
    tList.innerHTML = state.map(t=>`
      <li class="list-item pop">
        <div>
          <div class="title">${esc(t.title)}</div>
          <div class="meta">${esc(t.subject)} • entrega ${esc(t.due)}</div>
        </div>
        <div class="actions">
          <button class="chip" data-toggle-task="${t.id}">${t.done?'Entregue ✅':'Marcar entregue'}</button>
        </div>
      </li>`).join('');
    save();
  }
  function toggle(id){ const it=state.find(x=>x.id===id); if(it){ it.done=!it.done; save(); if(isCoarse) SFX.tap(); } }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{ return null; } }
})();

/* ===== Classroom (chat visual) ===== */
(() => {
  const list=$('#classroom-list'), chat=$('#classroom-chat'), tName=$('#teacherName'), tShort=$('#teacherShort'), back=$('#btnBackClassroom');
  const stream=$('#classroomStream'), input=$('#classroomInput'), send=$('#btnClassroomSend');
  const attachBtn=$('#btnAttach'), attachInput=$('#attachInput'), attachList=$('#attachList');
  if(!list||!chat) return;
  let files=[];
  $$('#tab-classroom .teacher-card [data-teacher]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const name=btn.dataset.teacher||'Professor';
      tName&&(tName.textContent=name); tShort&&(tShort.textContent=name);
      list.classList.add('hidden'); chat.classList.remove('hidden');
      stream&&(stream.innerHTML=`<div class="msg ai"><div class="bubble ${isCoarse?'pop':''}"><h4>${esc(name)}</h4><p>Oi! Como posso ajudar?</p></div></div>`);
      files=[]; attachList&&(attachList.innerHTML='');
      if(isCoarse && navigator.vibrate) navigator.vibrate(12);
      SFX.woosh();
    },{passive:true});
  });
  back?.addEventListener('click',()=>{chat.classList.add('hidden'); list.classList.remove('hidden'); SFX.woosh();},{passive:true});
  attachBtn?.addEventListener('click',()=>attachInput?.click(),{passive:true});
  attachInput?.addEventListener('change',()=>{files=Array.from(attachInput.files||[]); attachList&&(attachList.innerHTML=files.map(f=>`<span class="chip">${esc(f.name)}</span>`).join('')); if(isCoarse) SFX.tap();});
  function pushMe(html){ if(!stream) return; const d=document.createElement('div'); d.className='msg me'; d.innerHTML=`<div class="bubble ${isCoarse?'pop':''}">${html}</div>`; stream.appendChild(d); stream.scrollTop=stream.scrollHeight; SFX.blip(); }
  function pushAI(html){ if(!stream) return; const d=document.createElement('div'); d.className='msg ai'; d.innerHTML=`<div class="bubble ${isCoarse?'pop':''}"><h4>${esc(tName?.textContent||'Professor')}</h4>${html}</div>`; stream.appendChild(d); stream.scrollTop=stream.scrollHeight; SFX.pop(); }
  function typing(){ if(!stream) return null; const d=document.createElement('div'); d.className='msg ai'; d.innerHTML='<div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>'; stream.appendChild(d); stream.scrollTop=stream.scrollHeight; return d;}
  send?.addEventListener('click',()=>{const t=(input?.value||'').trim(); if(!t&&files.length===0) return;
    let body=''; if(t) body+=`<p>${esc(t)}</p>`; if(files.length) body+=`<div class="files">${files.map(f=>`<span class="chip">${esc(f.name)}</span>`).join('')}</div>`;
    pushMe(body); input&&(input.value=''); files=[]; attachInput&&(attachInput.value=''); attachList&&(attachList.innerHTML='');
    const hold=typing(); setTimeout(()=>{ hold&&hold.remove(); pushAI('<p>(visual) Recebido! 👍</p>'); },650);
  });
  input?.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); send?.click();}});
})();

/* ===== Chat IA (lista + modais ancorados) ===== */
(() => {
  const listEl=$('#chatList'), stream=$('#chatStream'), input=$('#chatInput'), send=$('#btnSend');
  const newBtn=$('#btnNewChat'), renBtn=$('#btnRenameChat'), delBtn=$('#btnDeleteChat');
  const title=$('#activeChatTitle'), hint=$('#activeChatHint');
  if(!listEl||!stream) return;

  const KEY='chalkrise_chats_student';
  let chats = load();
  let currentId = chats[0]?.id || null;

  renderList(); openCurrent();

  newBtn?.addEventListener('click', (e)=>{
    Modal.open({
      title:'Novo chat',
      html:`<label>Nome do chat</label><input id="newChatName" class="modal-input" placeholder="Ex: Dúvidas de Matemática" />`,
      buttons:[
        {label:'Cancelar', onClick:(c)=>c()},
        {label:'Criar', variant:'primary', onClick:()=>{
          const name = $('#newChatName', Modal.el).value.trim(); if(!name) return;
          const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
          const chat = { id, name, created: Date.now(), msgs:[{who:'ai', html:'<h4>Chalkrise IA</h4><p>Oi! Chat criado. Bora começar? ✨</p>'}]};
          chats.unshift(chat); currentId=id; save(); renderList(); openCurrent(); Modal.close(); SFX.pop();
        }}
      ],
      anchor:e.currentTarget
    });
  });

  renBtn?.addEventListener('click', (e)=>{
    const c = chats.find(x=>x.id===currentId); if(!c) return;
    Modal.open({
      title:'Renomear chat',
      html:`<label>Novo nome</label><input id="renameChatName" class="modal-input" value="${esc(c.name)}" />`,
      buttons:[
        {label:'Cancelar', onClick:(cls)=>cls()},
        {label:'Salvar', variant:'primary', onClick:()=>{
          const name = $('#renameChatName', Modal.el).value.trim(); if(!name) return;
          c.name = name; save(); renderList(); openCurrent(false); Modal.close(); SFX.pop();
        }}
      ],
      anchor:e.currentTarget
    });
  });

  delBtn?.addEventListener('click', (e)=>{
    const c = chats.find(x=>x.id===currentId); if(!c) return;
    Modal.open({
      title:'Excluir chat',
      html:`Tem certeza que deseja excluir <b>${esc(c.name)}</b>?`,
      buttons:[
        {label:'Cancelar', onClick:(cls)=>cls()},
        {label:'Excluir', variant:'primary', onClick:()=>{
          chats = chats.filter(x=>x.id!==c.id);
          currentId = chats[0]?.id || null; save(); renderList(); openCurrent(); Modal.close(); SFX.pop();
        }}
      ],
      anchor:e.currentTarget
    });
  });

  send?.addEventListener('click', ()=>{
    const t = (input?.value||'').trim(); if(!t || !currentId) return;
    push('me', `<p>${esc(t)}</p>`); input.value='';
    const hold = typing(); setTimeout(()=>{ hold.remove(); push('ai','<h4>Chalkrise IA</h4><p>(visual) resposta fake 😄</p>'); }, 560);
  });
  input?.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); send?.click();}});

  function renderList(){
    listEl.innerHTML = chats.map(c=>`
      <div class="ai-item ${c.id===currentId?'active':''}" data-id="${c.id}">
        <div>
          <div class="name">${esc(c.name)}</div>
          <div class="time">${new Date(c.created).toLocaleString('pt-BR')}</div>
        </div>
        <button class="del" title="Excluir" data-del="${c.id}">✕</button>
      </div>
    `).join('');
    $$('.ai-item', listEl).forEach(el=>{
      el.addEventListener('click', (e)=>{
        if(e.target.closest('[data-del]')) return;
        currentId = el.dataset.id; openCurrent(); renderList(); if(isCoarse) SFX.tap();
      }, {passive:true});
    });
    $$('[data-del]', listEl).forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        const id = btn.dataset.del;
        chats = chats.filter(x=>x.id!==id);
        if(currentId===id) currentId = chats[0]?.id || null;
        save(); renderList(); openCurrent(); SFX.pop();
      });
    });
  }

  function openCurrent(scrollBottom=true){
    stream.innerHTML=''; const c = chats.find(x=>x.id===currentId);
    title.textContent = c ? c.name : 'Chalkrise IA';
    hint.textContent  = c ? '' : 'Escolha um chat ou crie um novo';
    if(!c) return;
    c.msgs.forEach(m=>push(m.who, m.html, false));
    if(scrollBottom) stream.scrollTop = stream.scrollHeight;
  }

  function push(who, html, persist=true){
    const d=document.createElement('div'); d.className='msg '+who; d.innerHTML=`<div class="bubble ${isCoarse?'pop':''}">${html}</div>`;
    stream.appendChild(d); stream.scrollTop = stream.scrollHeight;
    if(who==='me') SFX.blip(); else SFX.pop();
    const c = chats.find(x=>x.id===currentId); if(c && persist){ c.msgs.push({who, html}); save(); }
  }
  function typing(){ const d=document.createElement('div'); d.className='msg ai'; d.innerHTML='<div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>'; stream.appendChild(d); stream.scrollTop=stream.scrollHeight; return d; }
  function save(){ localStorage.setItem(KEY, JSON.stringify(chats)); }
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{ return []; } }
})();
