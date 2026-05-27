/* =========================================================
   HoK Matchup Tracker — PWA logic
   Role-aware match logging with per-role rosters & history.
   Storage: localStorage, keyed by "hok-tracker-v1".
   ========================================================= */

const STORAGE_KEY = 'hok-tracker-v1';
const ROLES = ['jungle', 'mid', 'clash', 'adc', 'support'];
const ROLE_LABELS = {
  jungle: 'Jungle', mid: 'Mid', clash: 'Clash', adc: 'ADC', support: 'Support'
};

// ---------- Default seed data (carries over the pre-fills from earlier) ----------
function defaultRoleData() {
  return {
    myPicks:    [],   // string[]
    enemyPicks: [],   // string[]
    history:    []    // { id, myPick, enemyPick, result: 'W'|'L', ts }
  };
}
function defaultState() {
  const data = {};
  for (const r of ROLES) data[r] = defaultRoleData();
  // seed the jungle role with the heroes from earlier conversations
  data.jungle.myPicks    = ['Ukyo', 'Pei'];
  data.jungle.enemyPicks = ['Feyd', 'Wukong'];
  data.jungle.history = [
    { id: cryptoId(), myPick: 'Ukyo', enemyPick: 'Feyd',   result: 'W', ts: Date.now() - 86400000 },
    { id: cryptoId(), myPick: 'Pei',  enemyPick: 'Wukong', result: 'W', ts: Date.now() - 3600000 }
  ];
  return { version: 1, currentRole: 'jungle', data };
}

function cryptoId() {
  if (window.crypto && crypto.getRandomValues) {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  return Math.random().toString(36).slice(2);
}

// ---------- State + persistence ----------
let state;
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Forward-compat: ensure all roles exist
    for (const r of ROLES) {
      if (!parsed.data[r]) parsed.data[r] = defaultRoleData();
      parsed.data[r].myPicks    = parsed.data[r].myPicks    || [];
      parsed.data[r].enemyPicks = parsed.data[r].enemyPicks || [];
      parsed.data[r].history    = parsed.data[r].history    || [];
    }
    parsed.currentRole = parsed.currentRole || 'jungle';
    return parsed;
  } catch (e) {
    console.error('Bad saved state, resetting.', e);
    return defaultState();
  }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Storage error: ' + e.message, 'error'); }
}

function currentRoleData() { return state.data[state.currentRole]; }

// ---------- DOM helpers ----------
const $  = (id) => document.getElementById(id);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
function el(tag, attrs={}, ...children) {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

// ---------- Toast / status ----------
let toastTimer;
function toast(msg, kind='') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (kind ? ' ' + kind : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.hidden = true, 2200);
}
function setStatus(elId, msg, kind='') {
  const el = $(elId);
  el.textContent = msg;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

// ---------- Aggregation from history ----------
function computeRecord(myPick, enemyPick, role=state.currentRole) {
  if (!myPick || !enemyPick) return { wins: 0, games: 0 };
  const h = state.data[role].history;
  let w = 0, g = 0;
  for (const m of h) {
    if (m.myPick === myPick && m.enemyPick === enemyPick) {
      g++;
      if (m.result === 'W') w++;
    }
  }
  return { wins: w, games: g };
}
function computeOverall(role=state.currentRole) {
  const h = state.data[role].history;
  let w = 0;
  for (const m of h) if (m.result === 'W') w++;
  return { wins: w, games: h.length, losses: h.length - w };
}

// ---------- Render: role bar ----------
function renderRoleBar() {
  $$('.role-pill').forEach(btn => {
    btn.dataset.active = (btn.dataset.role === state.currentRole) ? 'true' : 'false';
  });
}

// ---------- Render: log view (selectors + record) ----------
function fillSelect(selectEl, options, preserve=true) {
  const prev = selectEl.value;
  selectEl.innerHTML = '';
  selectEl.appendChild(el('option', { value: '' }, '-- Select --'));
  for (const o of options) selectEl.appendChild(el('option', { value: o }, o));
  if (preserve && options.includes(prev)) selectEl.value = prev;
}
function renderLogView() {
  const d = currentRoleData();
  fillSelect($('myPick'), d.myPicks);
  fillSelect($('enemyPick'), d.enemyPicks);
  renderRecordCard();
  renderOverall();
}
function renderRecordCard() {
  const my = $('myPick').value, en = $('enemyPick').value;
  const card = $('recordCard');
  if (!my || !en) {
    card.innerHTML = '<div class="record-empty">Pick both heroes to see record</div>';
    return;
  }
  const { wins, games } = computeRecord(my, en);
  const losses = games - wins;
  const pct = games > 0 ? ((wins/games)*100).toFixed(1) + '%' : '—';
  card.innerHTML = '';
  card.appendChild(el('div', { class: 'record-line' }, `${wins}W · ${losses}L · ${games} games`));
  card.appendChild(el('div', { class: 'record-pct' + (games === 0 ? ' dim' : '') }, pct));
}
function renderOverall() {
  const { wins, games, losses } = computeOverall();
  $('ovWins').textContent   = wins;
  $('ovLosses').textContent = losses;
  $('ovTotal').textContent  = games;
  $('ovPct').textContent    = games > 0 ? ((wins/games)*100).toFixed(1) + '%' : '—';
}

// ---------- Render: matrix view ----------
function renderMatrix() {
  const d = currentRoleData();
  const hideEmpty = $('hideEmptyMatchups').checked;

  // Keep filter dropdowns in sync with the current roster
  populateFilterSelect($('filterMyPick'), d.myPicks);
  populateFilterSelect($('filterEnemyPick'), d.enemyPicks);

  const myFilter = $('filterMyPick').value;
  const enemyFilter = $('filterEnemyPick').value;
  const filtering = !!(myFilter || enemyFilter);
  $('clearFiltersBtn').hidden = !filtering;

  const table = $('matrixTable');
  table.innerHTML = '';

  // Compute which rows/cols have any games (for hide-empty)
  const rowHas = {}, colHas = {};
  if (hideEmpty) {
    for (const m of d.history) {
      rowHas[m.myPick] = true;
      colHas[m.enemyPick] = true;
    }
  }

  // Start from the full roster, then apply hide-empty, then apply explicit filters
  let rows = hideEmpty ? d.myPicks.filter(h => rowHas[h]) : d.myPicks.slice();
  let cols = hideEmpty ? d.enemyPicks.filter(h => colHas[h]) : d.enemyPicks.slice();
  if (myFilter)    rows = rows.filter(h => h === myFilter);
  if (enemyFilter) cols = cols.filter(h => h === enemyFilter);

  if (rows.length === 0 || cols.length === 0) {
    let msg;
    if (filtering) msg = 'No matchups for that filter.';
    else if (hideEmpty) msg = 'No played matchups yet for this role.';
    else msg = 'Add heroes on the Roster tab to get started.';
    table.appendChild(el('tr', {}, el('td', { class: 'empty' }, msg)));
    return;
  }

  // Header row
  const thead = el('thead');
  const headRow = el('tr');
  headRow.appendChild(el('th', { class: 'corner' }, 'My ↓ / Enemy →'));
  for (const c of cols) headRow.appendChild(el('th', {}, c));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const r of rows) {
    const tr = el('tr');
    tr.appendChild(el('th', {}, r));
    for (const c of cols) {
      const { wins, games } = computeRecord(r, c);
      if (games === 0) {
        tr.appendChild(el('td', { class: 'empty' }, '—'));
      } else {
        const pct = wins / games;
        const td = el('td', { class: 'cell' });
        td.style.background = colorScale(pct);
        const span = el('span', {}, (pct * 100).toFixed(0) + '%');
        td.appendChild(span);
        td.appendChild(el('span', { class: 'games-sub' }, `${wins}/${games}`));
        tr.appendChild(td);
      }
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
}

function populateFilterSelect(sel, options) {
  const prev = sel.value;
  sel.innerHTML = '';
  sel.appendChild(el('option', { value: '' }, 'All'));
  for (const o of options) sel.appendChild(el('option', { value: o }, o));
  // Preserve selection if still valid; otherwise fall back to "All"
  if (prev && options.includes(prev)) sel.value = prev;
  else sel.value = '';
}
function colorScale(t) {
  // 0 → red(F8696B), 0.5 → yellow(FFEB84), 1 → green(63BE7B)
  const stops = [
    { p: 0,   c: [248, 105, 107] },
    { p: 0.5, c: [255, 235, 132] },
    { p: 1,   c: [99, 190, 123] }
  ];
  let a, b;
  if (t <= 0.5) { a = stops[0]; b = stops[1]; }
  else          { a = stops[1]; b = stops[2]; }
  const k = (t - a.p) / (b.p - a.p);
  const mix = a.c.map((v, i) => Math.round(v + (b.c[i] - v) * k));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

// ---------- Render: history ----------
function renderHistory() {
  const list = $('historyList');
  const filter = ($('historySearch').value || '').trim().toLowerCase();
  const all = [...currentRoleData().history].sort((a,b) => b.ts - a.ts);
  const filtered = filter
    ? all.filter(m => m.myPick.toLowerCase().includes(filter) || m.enemyPick.toLowerCase().includes(filter))
    : all;
  list.innerHTML = '';
  if (filtered.length === 0) {
    list.appendChild(el('div', { class: 'empty-state' },
      all.length === 0 ? 'No games logged yet for this role.' : 'No matches match that filter.'));
    return;
  }
  for (const m of filtered) {
    const row = el('div', { class: 'history-row' });
    row.appendChild(el('div', { class: 'history-result ' + m.result }, m.result));
    const matchup = el('div', { class: 'history-matchup' });
    matchup.appendChild(document.createTextNode(m.myPick));
    matchup.appendChild(el('span', { class: 'vs-mini' }, 'vs'));
    matchup.appendChild(document.createTextNode(m.enemyPick));
    row.appendChild(matchup);
    row.appendChild(el('div', { class: 'history-time' }, formatTime(m.ts)));
    row.appendChild(el('button', { class: 'history-del', title: 'Delete', onclick: () => deleteMatch(m.id) }, '✕'));
    list.appendChild(row);
  }
}
function formatTime(ts) {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0,0,0,0);
  const matchDay = new Date(d); matchDay.setHours(0,0,0,0);
  const diff = Math.round((today - matchDay) / 86400000);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return 'Today ' + time;
  if (diff === 1) return 'Yesterday ' + time;
  if (diff < 7)   return diff + 'd ago';
  return d.toLocaleDateString();
}

// ---------- Render: roster ----------
function renderRoster() {
  const d = currentRoleData();
  renderChipList($('myRoster'), d.myPicks, 'my');
  renderChipList($('enemyRoster'), d.enemyPicks, 'enemy');
}
function renderChipList(container, names, side) {
  container.innerHTML = '';
  if (names.length === 0) {
    container.appendChild(el('div', { class: 'empty-state' }, 'No heroes yet.'));
    return;
  }
  for (const n of names) {
    const chip = el('span', { class: 'roster-chip' }, n);
    chip.appendChild(el('span', {
      class: 'x', title: 'Remove',
      onclick: () => removeHero(side, n)
    }, '×'));
    container.appendChild(chip);
  }
}

// ---------- Actions ----------
function logMatch(result) {
  const my = $('myPick').value, en = $('enemyPick').value;
  if (!my || !en) { setStatus('logStatus', 'Pick both heroes first.', 'error'); return; }
  const entry = { id: cryptoId(), myPick: my, enemyPick: en, result, ts: Date.now() };
  currentRoleData().history.push(entry);
  saveState();
  setStatus('logStatus', `Logged ${my} vs ${en}: ${result === 'W' ? 'Win' : 'Loss'}`, 'success');
  $('undoBtn').disabled = false;
  $('undoBtn').dataset.lastId = entry.id;
  renderRecordCard();
  renderOverall();
  // Light haptic on supported devices
  if (navigator.vibrate) navigator.vibrate(result === 'W' ? 20 : [15, 30, 15]);
}
function undoLast() {
  const lastId = $('undoBtn').dataset.lastId;
  if (!lastId) return;
  const hist = currentRoleData().history;
  const idx = hist.findIndex(m => m.id === lastId);
  if (idx === -1) { setStatus('logStatus', 'Nothing to undo.', 'error'); return; }
  const removed = hist.splice(idx, 1)[0];
  saveState();
  setStatus('logStatus', `Undid ${removed.myPick} vs ${removed.enemyPick} (${removed.result})`, 'success');
  $('undoBtn').disabled = true;
  delete $('undoBtn').dataset.lastId;
  renderRecordCard();
  renderOverall();
}
function deleteMatch(id) {
  const hist = currentRoleData().history;
  const idx = hist.findIndex(m => m.id === id);
  if (idx === -1) return;
  if (!confirm('Delete this match?')) return;
  hist.splice(idx, 1);
  saveState();
  renderHistory();
  renderRecordCard();
  renderOverall();
  toast('Match deleted');
}

function addHero(side, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) { toast('Enter a hero name', 'error'); return; }
  const d = currentRoleData();
  const list = side === 'my' ? d.myPicks : d.enemyPicks;
  if (list.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
    toast(`"${trimmed}" already in this list`, 'error');
    return;
  }
  list.push(trimmed);
  saveState();
  renderRoster();
  renderLogView();
  toast(`Added ${trimmed}`, 'success');
}
function removeHero(side, name) {
  if (!confirm(`Remove "${name}" from this list?\n(Past games with this hero are kept.)`)) return;
  const d = currentRoleData();
  const list = side === 'my' ? d.myPicks : d.enemyPicks;
  const i = list.indexOf(name);
  if (i !== -1) list.splice(i, 1);
  saveState();
  renderRoster();
  renderLogView();
  toast(`Removed ${name}`);
}

function resetCurrentRole() {
  if (!confirm(`Reset ALL data for the ${ROLE_LABELS[state.currentRole]} role?\nThis deletes the roster and match history for this role. Other roles are untouched.`)) return;
  state.data[state.currentRole] = defaultRoleData();
  saveState();
  renderAll();
  toast(`${ROLE_LABELS[state.currentRole]} reset`);
}

// ---------- Export / Import ----------
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
  a.href = url;
  a.download = `hok-tracker-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported', 'success');
}
function importDataFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.data || typeof parsed.data !== 'object') throw new Error('Missing data field');
      if (!confirm('This will REPLACE all current data. Continue?')) return;
      state = parsed;
      // Forward-compat patching
      state.currentRole = state.currentRole || 'jungle';
      for (const r of ROLES) {
        if (!state.data[r]) state.data[r] = defaultRoleData();
      }
      saveState();
      renderAll();
      toast('Imported', 'success');
    } catch (err) {
      toast('Import failed: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// ---------- Navigation ----------
function switchView(name) {
  $$('.view').forEach(v => v.dataset.active = (v.id === 'view-' + name) ? 'true' : 'false');
  $$('.nav-btn').forEach(b => b.dataset.active = (b.dataset.view === name) ? 'true' : 'false');
  if (name === 'matrix') renderMatrix();
  if (name === 'history') renderHistory();
  if (name === 'roster') renderRoster();
  if (name === 'log') renderLogView();
}
function switchRole(role) {
  if (!ROLES.includes(role)) return;
  state.currentRole = role;
  saveState();
  // Clear transient UI on role change
  setStatus('logStatus', '', '');
  $('undoBtn').disabled = true;
  delete $('undoBtn').dataset.lastId;
  if ($('historySearch')) $('historySearch').value = '';
  renderAll();
}
function renderAll() {
  renderRoleBar();
  renderLogView();
  // also refresh the currently-visible non-log view
  const active = $$('.view').find(v => v.dataset.active === 'true');
  if (active) {
    const id = active.id.replace('view-', '');
    if (id === 'matrix') renderMatrix();
    if (id === 'history') renderHistory();
    if (id === 'roster') renderRoster();
  }
}

// ---------- Menu sheet ----------
function openMenu() {
  $('menuBackdrop').hidden = false;
  $('menuSheet').hidden = false;
}
function closeMenu() {
  $('menuBackdrop').hidden = true;
  $('menuSheet').hidden = true;
}

// ---------- Bootstrap ----------
function bootstrap() {
  state = loadState();
  renderAll();

  // Role bar
  $$('.role-pill').forEach(b => b.addEventListener('click', () => switchRole(b.dataset.role)));

  // Bottom nav
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));

  // Log view interactions
  $('myPick').addEventListener('change', renderRecordCard);
  $('enemyPick').addEventListener('change', renderRecordCard);
  $('winBtn').addEventListener('click', () => logMatch('W'));
  $('lossBtn').addEventListener('click', () => logMatch('L'));
  $('undoBtn').addEventListener('click', undoLast);

  // Matrix toggle + filters
  $('hideEmptyMatchups').addEventListener('change', renderMatrix);
  $('filterMyPick').addEventListener('change', renderMatrix);
  $('filterEnemyPick').addEventListener('change', renderMatrix);
  $('clearFiltersBtn').addEventListener('click', () => {
    $('filterMyPick').value = '';
    $('filterEnemyPick').value = '';
    renderMatrix();
  });

  // History search
  $('historySearch').addEventListener('input', renderHistory);

  // Roster add
  $('addMyBtn').addEventListener('click', () => {
    const inp = $('addMyInput');
    addHero('my', inp.value); inp.value = '';
  });
  $('addEnemyBtn').addEventListener('click', () => {
    const inp = $('addEnemyInput');
    addHero('enemy', inp.value); inp.value = '';
  });
  // Enter key on add inputs
  $('addMyInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('addMyBtn').click(); });
  $('addEnemyInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('addEnemyBtn').click(); });

  // Data actions
  $('exportBtn').addEventListener('click', exportData);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importDataFile(f);
    e.target.value = '';
  });
  $('resetRoleBtn').addEventListener('click', resetCurrentRole);

  // Menu
  $('menuBtn').addEventListener('click', openMenu);
  $('menuBackdrop').addEventListener('click', closeMenu);
  $$('.menu-item').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.action;
    closeMenu();
    if (a === 'export') exportData();
    if (a === 'import') $('importFile').click();
    if (a === 'about') alert(
      'HoK Matchup Tracker\n\n' +
      'Track win rates across all roles (Jungle, Mid, Clash, ADC, Support).\n' +
      'Data is stored locally on this device.\n' +
      'Use Export/Import to move data between devices.\n\n' +
      'Install: tap your browser\'s Share or menu button, then "Add to Home Screen" / "Install app".'
    );
  }));

  // Service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW register failed', err));
    });
  }
}
document.addEventListener('DOMContentLoaded', bootstrap);
