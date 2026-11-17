(() => {
  'use strict';
  const USERS_KEY = 'gulp_accounts_v2';
  const CURRENT_KEY = 'gulp_current_v2';
  const $ = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const authDialog = $('#auth-dialog');
  const sessionDialog = $('#session-dialog');
  const profileDialog = $('#profile-dialog');
  const toast = $('#toast');
  const safeParse = (value, fallback) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
  const getUsers = () => safeParse(localStorage.getItem(USERS_KEY), {});
  const getCurrent = () => localStorage.getItem(CURRENT_KEY);
  let authMode = 'register';
  let toastTimer;
  let sessionTimer = null;
  let sessionStartedAt = 0;
  let elapsedBeforePause = 0;
  let markedEvents = 0;
  let sessionActive = false;

  function notice(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }
  function displayTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }
  function saveUser(username, user) {
    const users = getUsers();
    users[username] = user;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function activeUser() { return getUsers()[getCurrent()]; }
  function openAuth(mode) {
    authMode = mode;
    updateAuthMode();
    $('#auth-error').textContent = '';
    authDialog.showModal();
  }
  function updateAuthMode() {
    const register = authMode === 'register';
    all('[data-auth-tab]').forEach(tab => tab.classList.toggle('active', tab.dataset.authTab === authMode));
    $('#auth-title').textContent = register ? 'Create your GULP profile' : 'Welcome back';
    $('#auth-desc').textContent = register ? 'Pick a username to log in again on this browser.' : 'Use the username and password you saved here.';
    $('#name-field').hidden = !register;
    $('#name-field').querySelector('input').required = register;
    $('#email-field').hidden = !register;
    $('#username-field').querySelector('input').autocomplete = register ? 'username' : 'username';
    $('#auth-submit').innerHTML = register ? 'Create account <span>↗</span>' : 'Log in <span>↗</span>';
    $('#auth-form').elements.password.autocomplete = register ? 'new-password' : 'current-password';
  }
  function setView(name) {
    all('.dash-view').forEach(view => { view.hidden = view.id !== `view-${name}`; });
    all('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    if (name === 'history') drawSessions(activeUser());
    if (name === 'overview') drawOverview(activeUser());
  }
  function showPublic() {
    stopSession(true);
    $('#dashboard').hidden = true;
    document.body.classList.remove('dashboard-open');
  }
  function showDashboard() {
    const username = getCurrent();
    const user = activeUser();
    if (!user) { localStorage.removeItem(CURRENT_KEY); showPublic(); return; }
    if (!Array.isArray(user.sessions)) user.sessions = [];
    $('#dashboard').hidden = false;
    document.body.classList.add('dashboard-open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#dash-user').textContent = user.guest ? 'Guest demo' : `@${username}`;
    $('#welcome-name').textContent = user.name.trim().split(/\s+/)[0] || 'friend';
    $('#profile-name').textContent = user.name || 'Guest';
    $('#profile-name-copy').textContent = user.name || 'Guest';
    $('#profile-email').textContent = user.guest ? 'Guest profile · local to this browser' : (user.email || `@${username}`);
    $('#profile-username-copy').textContent = user.guest ? 'Guest demo' : `Username: ${username}`;
    $('#profile-initial').textContent = (user.name.trim()[0] || 'G').toUpperCase();
    $('#device-label').textContent = user.device || 'Not set';
    $('#reminder-form').elements.reminder.value = user.reminder || '';
    $('#reminder-status').textContent = user.reminder ? `Preferred reminder time: ${user.reminder}. This demo does not send notifications.` : 'No reminder set. This demo does not send notifications.';
    $('#connection-label').textContent = 'Waiting for hardware';
    $('#connection-copy').textContent = 'This demo cannot connect to Bluetooth or read from the pictured device.';
    setView('overview');
    drawSessions(user);
  }
  function drawOverview(user) {
    if (!user) return;
    const sessions = user.sessions || [];
    $('#summary-sessions').textContent = String(sessions.length);
    const newest = sessions.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    $('#summary-last').textContent = newest ? new Date(`${newest.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
    const recent = $('#recent-list');
    recent.replaceChildren();
    if (!sessions.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No saved sessions yet. Your notes will appear here.';
      recent.append(empty);
      return;
    }
    sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).forEach(item => {
      const row = document.createElement('div'); row.className = 'recent-row';
      const label = document.createElement('span'); label.textContent = item.mode === 'simulation' ? 'Demo session' : (item.context || 'Session note');
      const date = document.createElement('time'); date.textContent = new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      row.append(label, date); recent.append(row);
    });
  }
  function drawSessions(user) {
    if (!user) return;
    const list = $('#session-list');
    list.replaceChildren();
    $('#empty-state').hidden = (user.sessions || []).length > 0;
    (user.sessions || []).slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(session => {
      const item = document.createElement('article'); item.className = 'session-item';
      const content = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = session.mode === 'simulation' ? 'Demonstration session · simulated' : (session.context || 'Session note');
      const date = document.createElement('time');
      date.textContent = new Date(`${session.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      content.append(title);
      const detail = [];
      if (session.mode === 'simulation') detail.push(`${displayTime(session.durationSec || 0)} demo time`, `${session.events || 0} manually marked demo events`);
      if (session.note) detail.push(session.note);
      if (detail.length) { const note = document.createElement('p'); note.textContent = detail.join(' · '); content.append(note); }
      const remove = document.createElement('button'); remove.className = 'session-delete'; remove.type = 'button'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', 'Remove this saved session');
      remove.addEventListener('click', () => {
        const username = getCurrent(); const updated = activeUser();
        updated.sessions = updated.sessions.filter(row => row.id !== session.id);
        saveUser(username, updated); drawSessions(updated); drawOverview(updated); notice('Saved entry removed.');
      });
      item.append(content, date, remove); list.append(item);
    });
    drawHistory(user);
    drawOverview(user);
  }
  function drawHistory(user) {
    if (!user) return;
    const chart = $('#history-chart');
    chart.replaceChildren();
    const sessions = user.sessions || [];
    $('#history-count').textContent = `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`;
    if (!sessions.length) {
      const empty = document.createElement('p'); empty.textContent = 'Add a session to start your timeline.'; chart.append(empty); return;
    }
    const totals = new Map();
    sessions.forEach(session => totals.set(session.date, (totals.get(session.date) || 0) + 1));
    const maximum = Math.max(...totals.values());
    [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-10).forEach(([date, amount]) => {
      const column = document.createElement('div'); column.className = 'history-column';
      const value = document.createElement('span'); value.className = 'history-value'; value.textContent = String(amount);
      const bar = document.createElement('div'); bar.className = 'history-bar'; bar.style.height = `${Math.max(8, amount / maximum * 100)}%`;
      const label = document.createElement('time'); label.textContent = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      column.append(value, bar, label); chart.append(column);
    });
  }
  function randomWavePath(phase) {
    let path = 'M0 96';
    for (let x = 0; x <= 720; x += 8) {
      let y = 96 + Math.sin((x + phase) / 24) * 5 + Math.sin((x + phase) / 9) * 2;
      for (const center of [140, 365, 570]) {
        const distance = x - ((center + phase * 1.5) % 710);
        y -= Math.exp(-(distance * distance) / 230) * 48;
        y += Math.exp(-((distance - 20) * (distance - 20)) / 250) * 44;
      }
      path += ` L${x} ${Math.round(y)}`;
    }
    return path;
  }
  function updateSessionDisplay() {
    if (!sessionActive) return;
    const elapsed = elapsedBeforePause + Math.floor((Date.now() - sessionStartedAt) / 1000);
    $('#session-timer').textContent = displayTime(elapsed);
    $('#live-wave').setAttribute('d', randomWavePath(elapsed));
  }
  function startSession() {
    if (sessionActive) return;
    sessionActive = true;
    sessionStartedAt = Date.now();
    $('#live-status').textContent = elapsedBeforePause ? 'Session resumed · demo' : 'Session in progress · demo';
    $('#start-session').textContent = 'Pause session';
    $('#start-session').classList.add('button-light');
    $('#mark-event').disabled = false;
    $('#finish-session').disabled = false;
    $('.live-chart').classList.add('active');
    sessionTimer = setInterval(updateSessionDisplay, 250);
  }
  function pauseSession() {
    if (!sessionActive) return;
    elapsedBeforePause += Math.floor((Date.now() - sessionStartedAt) / 1000);
    sessionActive = false;
    clearInterval(sessionTimer); sessionTimer = null;
    $('#live-status').textContent = 'Paused · demo';
    $('#start-session').textContent = 'Resume session';
    $('.live-chart').classList.remove('active');
  }
  function stopSession(reset) {
    if (sessionActive) elapsedBeforePause += Math.floor((Date.now() - sessionStartedAt) / 1000);
    sessionActive = false;
    clearInterval(sessionTimer); sessionTimer = null;
    $('.live-chart')?.classList.remove('active');
    if (reset) {
      elapsedBeforePause = 0; markedEvents = 0;
      $('#session-timer').textContent = '00:00'; $('#event-count').textContent = '0';
      $('#live-status').textContent = 'Ready to begin';
      $('#start-session').textContent = 'Start session'; $('#start-session').classList.remove('button-light');
      $('#mark-event').disabled = true; $('#finish-session').disabled = true;
      $('#live-wave').setAttribute('d', 'M0 100 Q20 94 40 100 T80 100 T120 100 T160 100 T200 100 T240 100 T280 100 T320 100 T360 100 T400 100 T440 100 T480 100 T520 100 T560 100 T600 100 T640 100 T680 100 T720 100');
    }
  }
  function finishSession() {
    if (sessionActive) pauseSession();
    const user = activeUser();
    if (!user) return;
    const username = getCurrent();
    user.sessions.push({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      mode: 'simulation', date: new Date().toISOString().slice(0, 10),
      durationSec: elapsedBeforePause, events: markedEvents,
      note: 'Simulated signal preview. Not a real device recording or clinical result.'
    });
    saveUser(username, user);
    stopSession(true);
    drawSessions(user); setView('history'); notice('Demo session saved and labeled as simulated.');
  }

  all('[data-open-auth]').forEach(button => button.addEventListener('click', () => openAuth(button.dataset.openAuth)));
  all('[data-auth-tab]').forEach(button => button.addEventListener('click', () => { authMode = button.dataset.authTab; updateAuthMode(); $('#auth-error').textContent = ''; }));
  all('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [authDialog, sessionDialog, profileDialog].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  $('#auth-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get('username')).trim().toLowerCase();
    const password = String(data.get('password'));
    const users = getUsers();
    const error = $('#auth-error');
    if (!username) { error.textContent = 'Choose a username to continue.'; return; }
    if (authMode === 'register') {
      if (users[username]) { error.textContent = 'That username is already in use on this browser. Try logging in.'; return; }
      users[username] = { name: String(data.get('name')).trim(), username, email: String(data.get('email')).trim(), password, device: '', reminder: '', sessions: [] };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else if (!users[username] || users[username].password !== password) {
      error.textContent = 'The username and password do not match a profile saved in this browser.'; return;
    }
    localStorage.setItem(CURRENT_KEY, username);
    authDialog.close(); event.currentTarget.reset(); showDashboard();
  });
  all('[data-guest]').forEach(button => button.addEventListener('click', () => {
    const users = getUsers();
    if (!users.__guest__) users.__guest__ = { name: 'Guest', username: '__guest__', device: '', reminder: '', sessions: [], guest: true };
    localStorage.setItem(USERS_KEY, JSON.stringify(users)); localStorage.setItem(CURRENT_KEY, '__guest__');
    if (authDialog.open) authDialog.close(); showDashboard();
  }));
  $('#logout').addEventListener('click', () => { localStorage.removeItem(CURRENT_KEY); showPublic(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  all('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#start-session').addEventListener('click', () => sessionActive ? pauseSession() : startSession());
  $('#mark-event').addEventListener('click', () => { markedEvents += 1; $('#event-count').textContent = String(markedEvents); notice('Demo event marked. This is not an automatic swallow detection.'); });
  $('#finish-session').addEventListener('click', finishSession);
  $('#session-note-open').addEventListener('click', () => openSessionNote());
  const openSessionNote = () => { $('#session-form').elements.date.value = new Date().toISOString().slice(0, 10); sessionDialog.showModal(); };
  $('#add-session').addEventListener('click', openSessionNote);
  $('#session-form').addEventListener('submit', event => {
    event.preventDefault(); const username = getCurrent(); const user = activeUser(); if (!user) return;
    const data = new FormData(event.currentTarget);
    user.sessions.push({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, mode: 'note', date: String(data.get('date')), context: String(data.get('context')).trim(), note: String(data.get('note')).trim() });
    saveUser(username, user); event.currentTarget.reset(); sessionDialog.close(); drawSessions(user); setView('history'); notice('Session note saved in this browser.');
  });
  $('#edit-profile').addEventListener('click', () => { const user = activeUser(); if (!user) return; const form = $('#profile-form'); form.elements.name.value = user.name; form.elements.email.value = user.email || ''; form.elements.device.value = user.device || ''; profileDialog.showModal(); });
  $('#profile-form').addEventListener('submit', event => { event.preventDefault(); const username = getCurrent(); const user = activeUser(); if (!user) return; const data = new FormData(event.currentTarget); user.name = String(data.get('name')).trim(); user.email = String(data.get('email')).trim(); user.device = String(data.get('device')).trim(); saveUser(username, user); profileDialog.close(); showDashboard(); setView('profile'); notice('Profile updated.'); });
  $('#reminder-form').addEventListener('submit', event => { event.preventDefault(); const username = getCurrent(); const user = activeUser(); if (!user) return; user.reminder = String(new FormData(event.currentTarget).get('reminder')); saveUser(username, user); $('#reminder-status').textContent = user.reminder ? `Preferred reminder time: ${user.reminder}. This demo does not send notifications.` : 'No reminder set. This demo does not send notifications.'; notice('Preference saved locally.'); });
  $('#pair-device').addEventListener('click', () => { $('#connection-label').textContent = 'Demo flow only'; $('#connection-copy').textContent = 'Pairing is not active. This button only previews the planned device screen; no Bluetooth request was sent.'; notice('Hardware connection is not implemented.'); });
  $('#export-data').addEventListener('click', () => {
    const user = activeUser(); if (!user) return;
    const blob = new Blob([JSON.stringify({ profile: { name: user.name, username: user.username, device: user.device || null }, sessions: user.sessions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'gulp-session-record.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Your saved notes were exported.');
  });
  $('#delete-profile').addEventListener('click', () => {
    if (!confirm('Delete this local demo account and its session notes from this browser?')) return;
    const username = getCurrent(); const users = getUsers(); delete users[username];
    localStorage.setItem(USERS_KEY, JSON.stringify(users)); localStorage.removeItem(CURRENT_KEY); showPublic(); window.scrollTo({ top: 0, behavior: 'smooth' }); notice('Local account deleted.');
  });
  const menu = $('.menu-toggle'), publicNav = $('.topbar nav');
  menu.addEventListener('click', () => { const expanded = menu.getAttribute('aria-expanded') === 'true'; menu.setAttribute('aria-expanded', String(!expanded)); publicNav.classList.toggle('open', !expanded); });
  publicNav.querySelectorAll('a,button').forEach(item => item.addEventListener('click', () => { publicNav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }));
  if (getCurrent()) showDashboard();
})();
