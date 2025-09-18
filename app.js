// helpers
const $  = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));

/* ===== header date ===== */
(() => {
  const el = $('#today');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
})();

/* ===== theme (dark default) ===== */
(() => {
  const root=document.documentElement, fx=$('#themeFx');
  const stored=localStorage.getItem('theme');
  applyTheme(stored||'dark', false);

  bind('#btnThemeLogin','#themeLabelLogin','#icSunLogin','#icMoonLogin');
  bind('#btnTheme','#themeLabel','#icSun','#icMoon');

  function bind(btnSel,labelSel,sunSel,moonSel){
    const btn=$(btnSel); if(!btn) return;
    const label=$(labelSel), sun=$(sunSel), moon=$(moonSel);
    reflect(root.dataset.theme);
    btn.addEventListener('click', ()=>{
      const next=root.dataset.theme==='dark'?'light':'dark';
      applyTheme(next,true); reflect(next);
    });
    function reflect(mode){
      if(label) label.textContent=`Tema: ${mode==='dark'?'Escuro':'Claro'}`;
      if(sun&&moon){
        const showSun=mode==='light';
        sun.classList.toggle('hidden',!showSun);
        moon.classList.toggle('hidden',showSun);
      }
    }
  }
  function applyTheme(mode, animate){
    root.dataset.theme=mode; localStorage.setItem('theme',mode);
    if(animate){ fx.classList.add('on'); setTimeout(()=>fx.classList.remove('on'), 320); }
    dispatchEvent(new CustomEvent('themechange',{detail:{mode}}));
  }
})();

/* ===== tabs por delegação no dock ===== */
(() => {
  const tabs=$$('.tab');
  const dock=$('#dock');

  function open(sel){
    if(!sel) return;
    tabs.forEach(t=>t.classList.remove('active'));
    $(sel)?.classList.add('active');

    // estado ARIA/ativo
    $$('.dock-btn', dock).forEach(b=>{
      const on = b.dataset.open===sel;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    window.scrollTo({top:0, behavior:'smooth'});
  }

  // delegação (pega cliques em qualquer botão do dock)
  dock.addEventListener('click', (e)=>{
    const btn = e.target.closest('.dock-btn');
    if(!btn) return;
    open(btn.dataset.open);
  });
})();

/* ===== partículas ===== */
(() => {
  const cv=$('#stars'); if(!cv) return; const ctx=cv.getContext('2d');
  let W=0,H=0,P=[], topc, botc, fill, halo;
  function pal(){const cs=getComputedStyle(document.documentElement);
    topc=cs.getPropertyValue('--sky-top').trim(); botc=cs.getPropertyValue('--sky-bot').trim();
    fill=cs.getPropertyValue('--star-fill').trim(); halo=cs.getPropertyValue('--star-halo').trim();
  }
  pal(); addEventListener('themechange',pal);
  function resize(){W=cv.width=innerWidth; H=cv.height=innerHeight;
    const n=Math.min(200,Math.floor(W*H/12000));
    P=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.4,vx:(Math.random()-.5)*.2,vy:-(Math.random()*.6+.1)}));
  }
  addEventListener('resize',resize); resize();
  (function draw(){
    ctx.clearRect(0,0,W,H);
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,topc); g.addColorStop(1,botc);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    P.forEach(p=>{p.x+=p.vx; p.y+=p.vy; if(p.y<-10){p.y=H+10;p.x=Math.random()*W}
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=fill; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*2.2,0,Math.PI*2); ctx.strokeStyle=halo; ctx.stroke();
    });
    requestAnimationFrame(draw);
  })();
})();

/* ===== login (visual) ===== */
(() => {
  const screen=$('#screen-login'), app=$('#app');
  $('#btnSkip')?.addEventListener('click',goHome);
  $('#btnLogin')?.addEventListener('click',e=>{e.preventDefault(); goHome();});
  $('#btnGoLogin')?.addEventListener('click',()=>{app.classList.add('hidden'); screen.classList.remove('hidden'); window.scrollTo({top:0,behavior:'instant'});});
  function goHome(){screen.classList.add('hidden'); app.classList.remove('hidden');}
})();

/* ===== Modal genérico ===== */
const Modal = (() => {
  const wrap = $('#appModal'); if(!wrap) return null;
  const title = $('#modalTitle'), body = $('#modalBody'), actions = $('#modalActions');
  $('#modalClose').addEventListener('click', close);
  wrap.querySelector('.modal-backdrop').addEventListener('click', close);
  function open({title:t, html, buttons=[]}){
    title.textContent = t || '—';
    body.innerHTML = html || '';
    actions.innerHTML = '';
    buttons.forEach(b=>{
      const el = document.createElement('button');
      el.className = `modal-btn ${b.variant||''}`.trim();
      el.textContent = b.label;
      el.addEventListener('click', ()=>b.onClick?.(close));
      actions.appendChild(el);
    });
    wrap.classList.remove('hidden');
    setTimeout(()=>{ wrap.querySelector('input,textarea,button')?.focus(); }, 10);
  }
  function close(){ wrap.classList.add('hidden'); }
  return { open, close, el:wrap };
})();

/* ===== Classroom (visual e separado) ===== */
(() => {
  const list=$('#classroom-list'), chat=$('#classroom-chat'), tName=$('#teacherName'), tShort=$('#teacherShort'), back=$('#btnBackClassroom');
  const stream=$('#classroomStream'), input=$('#classroomInput'), send=$('#btnClassroomSend');
  const attachBtn=$('#btnAttach'), attachInput=$('#attachInput'), attachList=$('#attachList');
  if(!list||!chat) return;
  let files=[]; const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $$('#tab-classroom .teacher button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const name=btn.dataset.teacher||'Professor';
      tName&&(tName.textContent=name); tShort&&(tShort.textContent=name);
      list.classList.add('hidden'); chat.classList.remove('hidden');
      stream&&(stream.innerHTML=`<div class="msg ai"><div class="bubble pop"><h4>${esc(name)}</h4><p>Oi! Como posso ajudar?</p></div></div>`);
      files=[]; attachList&&(attachList.innerHTML='');
    });
  });
  back?.addEventListener('click',()=>{chat.classList.add('hidden'); list.classList.remove('hidden');});
  attachBtn?.addEventListener('click',()=>attachInput?.click());
  attachInput?.addEventListener('change',()=>{files=Array.from(attachInput.files||[]); attachList&&(attachList.innerHTML=files.map(f=>`<span class="file-chip">${esc(f.name)}</span>`).join(''));});
  function pushMe(html){ if(!stream) return; const d=document.createElement('div'); d.className='msg me'; d.innerHTML=`<div class="bubble pop">${html}</div>`; stream.appendChild(d); stream.scrollTop=stream.scrollHeight;}
  function pushAI(html){ if(!stream) return; const d=document.createElement('div'); d.className='msg ai'; const n=esc(tName?.textContent||'Professor'); d.innerHTML=`<div class="bubble pop"><h4>${n}</h4>${html}</div>`; stream.appendChild(d); stream.scrollTop=stream.scrollHeight;}
  function typing(){ if(!stream) return null; const d=document.createElement('div'); d.className='msg ai'; d.innerHTML='<div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>'; stream.appendChild(d); stream.scrollTop=stream.scrollHeight; return d;}
  send?.addEventListener('click',()=>{const t=(input?.value||'').trim(); if(!t&&files.length===0) return;
    let body=''; if(t) body+=`<p>${esc(t)}</p>`; if(files.length) body+=`<div class="files">${files.map(f=>`<span class="file-chip">${esc(f.name)}</span>`).join('')}</div>`;
    pushMe(body); input&&(input.value=''); files=[]; attachInput&&(attachInput.value=''); attachList&&(attachList.innerHTML='');
    const hold=typing(); setTimeout(()=>{ hold&&hold.remove(); pushAI('<p>(visual) Recebido! 👍</p>'); },700);
  });
  input?.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); send?.click();}});
})();

/* ===== Chat IA (lista + modal) ===== */
(() => {
  const listEl=$('#chatList'), stream=$('#chatStream'), input=$('#chatInput'), send=$('#btnSend');
  const newBtn=$('#btnNewChat'), renBtn=$('#btnRenameChat'), delBtn=$('#btnDeleteChat');
  const title=$('#activeChatTitle'), hint=$('#activeChatHint');
  if(!listEl||!stream) return;

  const KEY='chalkrise_chats_v2';
  let chats = load();
  let currentId = chats[0]?.id || null;

  renderList(); openCurrent();

  newBtn?.addEventListener('click', ()=>{
    Modal.open({
      title:'Novo chat',
      html:`<label>Nome do chat</label><input id="newChatName" class="modal-input" placeholder="Ex: Planejamento 7ºA" />`,
      buttons:[
        {label:'Cancelar', onClick:(c)=>c()},
        {label:'Criar', variant:'primary', onClick:()=>{
          const name = $('#newChatName', Modal.el).value.trim(); if(!name) return;
          const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
          const chat = { id, name, created: Date.now(), msgs:[{who:'ai', html:'<h4>Chalkrise IA</h4><p>Oi! Chat criado. Bora começar? ✨</p>'}]};
          chats.unshift(chat); currentId=id; save(); renderList(); openCurrent(); Modal.close();
        }}
      ]
    });
  });

  renBtn?.addEventListener('click', ()=>{
    const c = chats.find(x=>x.id===currentId); if(!c) return;
    Modal.open({
      title:'Renomear chat',
      html:`<label>Novo nome</label><input id="renameChatName" class="modal-input" value="${escapeHtml(c.name)}" />`,
      buttons:[
        {label:'Cancelar', onClick:(cls)=>cls()},
        {label:'Salvar', variant:'primary', onClick:()=>{
          const name = $('#renameChatName', Modal.el).value.trim(); if(!name) return;
          c.name = name; save(); renderList(); openCurrent(false); Modal.close();
        }}
      ]
    });
  });

  delBtn?.addEventListener('click', ()=>{
    const c = chats.find(x=>x.id===currentId); if(!c) return;
    Modal.open({
      title:'Excluir chat',
      html:`Tem certeza que deseja excluir <b>${escapeHtml(c.name)}</b>?`,
      buttons:[
        {label:'Cancelar', onClick:(cls)=>cls()},
        {label:'Excluir', variant:'primary', onClick:()=>{
          chats = chats.filter(x=>x.id!==c.id);
          currentId = chats[0]?.id || null; save(); renderList(); openCurrent(); Modal.close();
        }}
      ]
    });
  });

  send?.addEventListener('click', ()=>{
    const t = (input?.value||'').trim(); if(!t || !currentId) return;
    push('me', `<p>${escapeHtml(t)}</p>`); input.value='';
    const hold = typing();
    setTimeout(()=>{ hold.remove(); push('ai','<h4>Chalkrise IA</h4><p>(visual) resposta fake 😄</p>'); }, 600);
  });
  input?.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); send?.click();}});

  function renderList(){
    listEl.innerHTML = chats.map(c=>`
      <div class="ai-item ${c.id===currentId?'active':''}" data-id="${c.id}">
        <div>
          <div class="name">${escapeHtml(c.name)}</div>
          <div class="time">${new Date(c.created).toLocaleString('pt-BR')}</div>
        </div>
        <button class="del" title="Excluir" data-del="${c.id}">✕</button>
      </div>
    `).join('');
    $$('.ai-item', listEl).forEach(el=>{
      el.addEventListener('click', (e)=>{
        if(e.target.closest('[data-del]')) return;
        currentId = el.dataset.id; openCurrent(); renderList();
      });
    });
    $$('[data-del]', listEl).forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        const id = btn.dataset.del;
        chats = chats.filter(x=>x.id!==id);
        if(currentId===id) currentId = chats[0]?.id || null;
        save(); renderList(); openCurrent();
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
    const d=document.createElement('div'); d.className='msg '+who; d.innerHTML=`<div class="bubble pop">${html}</div>`;
    stream.appendChild(d); stream.scrollTop = stream.scrollHeight;
    const c = chats.find(x=>x.id===currentId); if(c && persist){ c.msgs.push({who, html}); save(); }
  }
  function typing(){ const d=document.createElement('div'); d.className='msg ai'; d.innerHTML='<div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>'; stream.appendChild(d); stream.scrollTop=stream.scrollHeight; return d; }
  function save(){ localStorage.setItem(KEY, JSON.stringify(chats)); }
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{ return []; } }
})();

/* ===== Widgets ===== */
(() => {
  // Evento com countdown (exemplo: hoje às 15:00)
  const target = new Date(); target.setHours(15,0,0,0);
  const cdEl = $('#evt-countdown'), dEl=$('#evt-day'), mEl=$('#evt-mon');
  const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  dEl && (dEl.textContent = String(target.getDate()).padStart(2,'0'));
  mEl && (mEl.textContent = months[target.getMonth()]);
  function tick(){
    const now = new Date();
    let diff = Math.max(0, target - now);
    const h = Math.floor(diff/3_600_000);
    diff -= h*3_600_000;
    const m = Math.floor(diff/60_000);
    diff -= m*60_000;
    const s = Math.floor(diff/1_000);
    if(cdEl) cdEl.textContent = `Começa em ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    requestAnimationFrame(tick);
  }
  tick();

  // Checklist persistente
  const KEY='chalkrise_todo_v1';
  const list=$('#todoList'), inp=$('#todoInput'), add=$('#todoAdd');
  let items = load();
  render();
  add?.addEventListener('click',()=>{const t=(inp?.value||'').trim(); if(!t) return; items.push({t,done:false,id:Date.now()}); inp.value=''; save(); render();});
  inp?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault(); add?.click();}});
  function render(){
    if(!list) return;
    list.innerHTML = items.map(it=>`
      <li data-id="${it.id}">
        <div class="left">
          <input type="checkbox" ${it.done?'checked':''}/>
          <span>${escapeHtml(it.t)}</span>
        </div>
        <button class="del">✕</button>
      </li>`).join('');
    $$('li',list).forEach(li=>{
      const id=Number(li.dataset.id);
      li.querySelector('input').addEventListener('change',e=>{const it=items.find(x=>x.id===id); it.done=e.target.checked; save();});
      li.querySelector('.del').addEventListener('click',()=>{items=items.filter(x=>x.id!==id); save(); render();});
    });
  }
  function save(){ localStorage.setItem(KEY, JSON.stringify(items)); }
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{ return []; } }

  // Notas rápidas
  const NKEY='chalkrise_notes_v1'; const area=$('#notesArea'), saved=$('#notesSaved');
  if(area){ area.value = localStorage.getItem(NKEY)||''; area.addEventListener('input',()=>{ localStorage.setItem(NKEY, area.value); saved.textContent='Salvo agora'; setTimeout(()=>saved.textContent=' ', 1000); }); }
})();

/* util */
function escapeHtml(s){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
