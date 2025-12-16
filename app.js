const $ = (sel) => document.querySelector(sel);

const state = {
  title: 'Sin título.txt',
  content: '',
  theme: 'light',
  font: 'inter',
  fontSize: 16,
  adsClient: '',
  adsSlot: '',
};

const templates = {
  notes: `# Notas rápidas

- Idea:
- Pendiente:
- Recordatorio:

— Hecho con 💖`,
  todo: `# Lista de tareas

[ ] Tarea 1
[ ] Tarea 2
[ ] Tarea 3

— Hecho con 💖`,
  meeting: `# Minuta de reunión

Fecha:
Participantes:
Agenda:

Decisiones:
Acciones:

— Hecho con 💖`,
  journal: `# Diario

Hoy me siento:
Lo mejor del día:
Aprendizaje:

— Hecho con 💖`,
};

const storageKey = 'txt-studio';
const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

function loadFromStorage() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.assign(state, data);
  } catch {}
}

function saveToStorage() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
const saveToStorageDebounced = debounce(saveToStorage, 300);

function applyStateToUI() {
  $('#titleInput').value = state.title;
  $('#editor').value = state.content;
  $('#fontSelect').value = state.font;
  $('#fontSize').value = state.fontSize;
  $('#themeToggle').checked = state.theme === 'dark';
  document.body.classList.toggle('dark', state.theme === 'dark');
  $('#editor').classList.toggle('mono', state.font === 'mono');
  $('#editor').classList.toggle('inter', state.font === 'inter');
  $('#editor').style.fontSize = `${state.fontSize}px`;
  $('#adsClient').value = state.adsClient || '';
  $('#adsSlot').value = state.adsSlot || '';
  updateStats();
  setupAdSense();
}

function updateStats() {
  const text = $('#editor').value;
  const chars = text.length;
  const words = (text.trim().match(/\S+/g) || []).length;
  const lines = text.split(/\r?\n/).length;
  $('#charCount').textContent = `${chars} caracteres`;
  $('#wordCount').textContent = `${words} palabras`;
  $('#lineCount').textContent = `${lines} líneas`;
}

function newDoc() {
  state.title = 'Sin título.txt';
  state.content = '';
  applyStateToUI();
  saveToStorage();
}

async function openDocFromFile(file) {
  const text = await file.text();
  state.title = file.name || 'archivo.txt';
  state.content = text;
  applyStateToUI();
  saveToStorage();
}

function downloadTxt() {
  const blob = new Blob([$('#editor').value], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = $('#titleInput').value || 'archivo.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

function shareLink() {
  const encoded = btoa(unescape(encodeURIComponent($('#editor').value)));
  const title = encodeURIComponent($('#titleInput').value);
  const url = `${location.origin}${location.pathname}?title=${title}&data=${encoded}`;
  navigator.clipboard.writeText(url).then(() => {
    toast('Enlace copiado al portapapeles');
    history.replaceState(null, '', url);
  }).catch(() => {
    prompt('Copia tu enlace:', url);
  });
}

function tryLoadFromURL() {
  const p = new URLSearchParams(location.search);
  const data = p.get('data');
  const title = p.get('title');
  if (data) {
    try {
      const decoded = decodeURIComponent(escape(atob(data)));
      state.content = decoded;
      if (title) state.title = decodeURIComponent(title);
    } catch {}
  }
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(14,165,233,.9)', color: '#fff', padding: '10px 14px',
    borderRadius: '10px', fontWeight: '700', zIndex: '100',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function setupDragAndDrop() {
  const zone = $('#dropZone');
  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
    zone.addEventListener(ev, prevent);
  });
  zone.addEventListener('dragover', () => zone.classList.add('dragover'));
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', async (e) => {
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file) await openDocFromFile(file);
  });
}

function applyTemplate() {
  const key = $('#templateSelect').value;
  if (!key) return;
  state.content = templates[key] || '';
  applyStateToUI();
  saveToStorage();
}

function setupAdSense() {
  const ins = document.querySelector('ins.adsbygoogle');
  const fallback = document.querySelector('.ads-fallback');
  if (!ins) return;
  ins.setAttribute('data-ad-client', state.adsClient || '');
  ins.setAttribute('data-ad-slot', state.adsSlot || '');
  if (state.adsClient) {
    const existing = document.querySelector('script[data-adsense="true"]');
    if (!existing) {
      const s = document.createElement('script');
      s.async = true;
      s.setAttribute('data-adsense', 'true');
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(state.adsClient)}`;
      s.crossOrigin = 'anonymous';
      s.onload = () => {
        try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
      };
      s.onerror = () => {
        fallback.style.display = 'block';
      };
      document.head.appendChild(s);
    } else {
      try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    }
    fallback.style.display = 'none';
  } else {
    fallback.style.display = 'block';
  }
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#installPWA').style.display = 'inline-flex';
});

function setupEvents() {
  $('#newBtn').addEventListener('click', newDoc);
  $('#openInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await openDocFromFile(file);
    e.target.value = '';
  });
  $('#saveBtn').addEventListener('click', downloadTxt);
  $('#shareBtn').addEventListener('click', shareLink);
  $('#titleInput').addEventListener('input', (e) => {
    state.title = e.target.value || 'Sin título.txt';
    saveToStorageDebounced();
  });
  $('#editor').addEventListener('input', (e) => {
    state.content = e.target.value;
    updateStats();
    saveToStorageDebounced();
  });
  $('#templateSelect').addEventListener('change', () => {});
  $('#applyTemplate').addEventListener('click', applyTemplate);
  $('#themeToggle').addEventListener('change', (e) => {
    state.theme = e.target.checked ? 'dark' : 'light';
    document.body.classList.toggle('dark', state.theme === 'dark');
    saveToStorageDebounced();
  });
  $('#fontSelect').addEventListener('change', (e) => {
    state.font = e.target.value;
    $('#editor').classList.toggle('mono', state.font === 'mono');
    $('#editor').classList.toggle('inter', state.font === 'inter');
    saveToStorageDebounced();
  });
  $('#fontSize').addEventListener('input', (e) => {
    state.fontSize = +e.target.value;
    $('#editor').style.fontSize = `${state.fontSize}px`;
    saveToStorageDebounced();
  });
  $('#saveAds').addEventListener('click', () => {
    state.adsClient = $('#adsClient').value.trim();
    state.adsSlot = $('#adsSlot').value.trim();
    saveToStorage();
    setupAdSense();
    toast('Configuración de anuncios guardada');
  });

  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 's') { e.preventDefault(); downloadTxt(); }
    if (e.key.toLowerCase() === 'n') { e.preventDefault(); newDoc(); }
    if (e.key.toLowerCase() === 'o') { e.preventDefault(); $('#openInput').click(); }
  });

  $('#installPWA').addEventListener('click', async (e) => {
    e.preventDefault();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
      $('#installPWA').style.display = 'none';
    } else {
      toast('Agrega a inicio desde el menú del navegador');
    }
  });
}

function init() {
  tryLoadFromURL();
  loadFromStorage();
  applyStateToUI();
  setupEvents();
  setupDragAndDrop();
}

init();
