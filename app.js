// ==== data no header
(function () {
  const el = document.getElementById("today");
  if (!el) return;
  const d = new Date();
  const dias = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  el.textContent = `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;
})();

// ==== tema
const themeBtn = document.getElementById("themeBtn");
const themeFx = document.getElementById("themeFx");

function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode === "light" ? "light" : "dark");
  if (themeBtn) themeBtn.textContent = mode === "light" ? "☀️" : "🌙";
  if (themeFx) {
    themeFx.classList.add("on");
    setTimeout(() => themeFx.classList.remove("on"), 260);
  }
}
themeBtn?.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(cur === "dark" ? "light" : "dark");
});
setTheme("dark");

// ==== abas + dock (com delegação de eventos)
const tabs = Array.from(document.querySelectorAll(".tab"));
const dockEl = document.querySelector(".dock");
const dockBtns = () => Array.from(document.querySelectorAll(".d-btn"));

function showTab(name) {
  const target = document.getElementById(`tab-${name}`);
  if (!target) return;

  // troca visibilidade
  tabs.forEach((t) => t.classList.remove("active"));
  target.classList.add("active");

  // estado dos botões
  dockBtns().forEach((b) => b.classList.toggle("active", b.dataset.tab === name));

  // acessibilidade + rolar pro topo
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// delegação: captura clique em qualquer filho dentro do botão
dockEl?.addEventListener(
  "click",
  (e) => {
    const btn = e.target.closest(".d-btn");
    if (!btn || !dockEl.contains(btn)) return;
    e.preventDefault();
    const tab = btn.dataset.tab;
    if (tab) showTab(tab);
  },
  { passive: false }
);

// inicia na home
showTab("home");

// ==== swipe pra trocar aba (mobile)
let startX = null;
document.addEventListener(
  "touchstart",
  (e) => {
    startX = e.touches[0].clientX;
  },
  { passive: true }
);
document.addEventListener(
  "touchend",
  (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < 60) return;

    const order = ["home", "classroom", "ia"];
    const current = order.findIndex((k) => document.getElementById(`tab-${k}`)?.classList.contains("active"));
    if (current < 0) return;
    const next = dx < 0 ? Math.min(order.length - 1, current + 1) : Math.max(0, current - 1);
    showTab(order[next]);
  },
  { passive: true }
);

// ==== login modal
const loginBtn = document.getElementById("loginBtn");
const loginModal = document.getElementById("loginModal");
loginBtn?.addEventListener("click", () => openModal(loginModal));
loginModal?.addEventListener("click", (e) => {
  if (e.target.dataset.close !== undefined) closeModal(loginModal);
});

// ==== modal novo chat
const chatModal = document.getElementById("chatModal");
const newChatBtn = document.getElementById("newChatBtn");
const createChatBtn = document.getElementById("createChat");
newChatBtn?.addEventListener("click", () => openModal(chatModal));
chatModal?.addEventListener("click", (e) => {
  if (e.target.dataset.close !== undefined) closeModal(chatModal);
});

// helpers de modal (origem no botão)
function openModal(m) {
  if (!m) return;
  placeOrigin(m);
  m.classList.remove("hidden");
  requestAnimationFrame(() => m.classList.add("show"));
}
function closeModal(m) {
  if (!m) return;
  m.classList.remove("show");
  setTimeout(() => m.classList.add("hidden"), 180);
}
function placeOrigin(m) {
  const el = document.activeElement;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = ((r.left + r.width / 2) / window.innerWidth) * 100;
  const y = ((r.top + r.height / 2) / window.innerHeight) * 100;
  m.style.setProperty("--origin-x", `${x}%`);
  m.style.setProperty("--origin-y", `${y}%`);
}

// ==== toast
const toast = document.getElementById("toast");
function showToast(t) {
  if (!toast) return;
  toast.textContent = t;
  toast.classList.remove("hidden");
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => toast.classList.remove("show"), 1400);
}

// ==== Chat IA (visual)
const chatList = document.getElementById("chatList");
const chatTitle = document.getElementById("chatTitle");
const chatStream = document.getElementById("chatStream");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const renameBtn = document.getElementById("renameChat");
const deleteBtn = document.getElementById("deleteChat");
const chatNameInput = document.getElementById("chatNameInput");

let chats = []; // {id,name,msgs:[]}
let activeId = null;

function renderChats() {
  if (!chatList) return;
  chatList.innerHTML = "";
  chats.forEach((c) => {
    const li = document.createElement("div");
    li.className = "list-item";
    li.innerHTML = `<span><b>${c.name}</b></span><small class="muted">${c.msgs.length} msgs</small>`;
    li.addEventListener("click", () => setActive(c.id));
    chatList.appendChild(li);
  });
}
function setActive(id) {
  activeId = id;
  const c = chats.find((x) => x.id === id);
  if (chatTitle) chatTitle.textContent = c ? c.name : "Chalkrise IA";
  renderStream();
}
function renderStream() {
  if (!chatStream) return;
  chatStream.innerHTML = "";
  const c = chats.find((x) => x.id === activeId);
  if (!c) {
    chatStream.innerHTML = `<div class="muted">Escolha um chat ou crie um novo</div>`;
    return;
  }
  c.msgs.forEach((m) => {
    const row = document.createElement("div");
    row.className = "msg " + (m.me ? "me" : "");
    row.innerHTML = `<div class="bubble">${m.text}</div>`;
    chatStream.appendChild(row);
  });
  chatStream.scrollTop = chatStream.scrollHeight;
}

createChatBtn?.addEventListener("click", () => {
  const name = (chatNameInput?.value || `Chat ${chats.length + 1}`).trim();
  chats.unshift({ id: crypto.randomUUID(), name, msgs: [] });
  if (chatNameInput) chatNameInput.value = "";
  setActive(chats[0].id);
  closeModal(chatModal);
  renderChats();
  showToast("Chat criado");
});

renameBtn?.addEventListener("click", () => {
  const c = chats.find((x) => x.id === activeId);
  if (!c) return;
  openModal(chatModal);
  if (chatNameInput) chatNameInput.value = c.name;
  if (createChatBtn) {
    createChatBtn.onclick = () => {
      c.name = (chatNameInput?.value || c.name).trim();
      renderChats();
      setActive(c.id);
      closeModal(chatModal);
    };
  }
});

deleteBtn?.addEventListener("click", () => {
  if (!activeId) return;
  chats = chats.filter((x) => x.id !== activeId);
  activeId = chats[0]?.id ?? null;
  renderChats();
  renderStream();
  showToast("Chat excluído");
});

sendBtn?.addEventListener("click", send);
chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});
function send() {
  const c = chats.find((x) => x.id === activeId);
  if (!c || !chatInput) return;
  const v = chatInput.value.trim();
  if (!v) return;
  c.msgs.push({ me: true, text: v });
  chatInput.value = "";
  renderStream();
  setTimeout(() => {
    c.msgs.push({ me: false, text: "(visual) Beleza!" });
    renderStream();
  }, 500);
}
