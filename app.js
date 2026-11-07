let cfg;
let editingId = null;
const $ = (id) => document.getElementById(id);

function say(text, isError = false) {
  const el = $('status-message');
  el.textContent = text;
  el.style.color = isError ? '#c0392b' : '#27ae60';
}

async function api(path, options = {}) {
  const key = cfg.supabasePublishableKey;
  const headers = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key; // legacy anon JWT keys only
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function button(label, cls, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.className = cls;
  b.addEventListener('click', onClick);
  return b;
}

function render(tasks) {
  const list = $('task-list');
  list.innerHTML = '';
  tasks.forEach((t) => {
    const item = document.createElement('div');
    item.className = 'task-item' + (t.completed ? ' done' : '');
    item.dataset.id = t.id;
    const title = Object.assign(document.createElement('div'), { className: 'task-title', textContent: t.title });
    const desc = Object.assign(document.createElement('div'), { className: 'task-description', textContent: t.description || '' });
    const status = Object.assign(document.createElement('div'), { className: 'task-status', textContent: t.completed ? 'Completed' : 'Not completed' });
    item.append(title, desc, status,
      button(t.completed ? 'Mark incomplete' : 'Mark complete', 'toggle-task', () => run(() => api(`tasks?id=eq.${t.id}`, { method: 'PATCH', body: JSON.stringify({ completed: !t.completed }) }), 'Status updated')),
      button('Edit', 'edit-task', () => startEdit(t)),
      button('Delete', 'delete-task', () => run(() => api(`tasks?id=eq.${t.id}`, { method: 'DELETE' }), 'Task deleted')));
    list.appendChild(item);
  });
}

async function load() {
  try {
    render(await api('tasks?select=*&order=id.asc'));
  } catch (e) { say('Could not load tasks: ' + e.message, true); }
}

async function run(action, okText) {
  try { await action(); say(okText); await load(); }
  catch (e) { say('Operation failed: ' + e.message, true); }
}

function startEdit(t) {
  editingId = t.id;
  $('task-title').value = t.title;
  $('task-description').value = t.description || '';
  $('task-submit').textContent = 'Save changes';
  $('task-title').focus();
}

async function init() {
  try {
    cfg = await (await fetch('config.json')).json();
  } catch (e) { return say('Cannot read config.json', true); }
  $('task-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const body = { title: $('task-title').value.trim(), description: $('task-description').value.trim() };
    if (!body.title) return say('Title is required', true);
    const wasEditing = editingId !== null;
    const call = wasEditing
      ? () => api(`tasks?id=eq.${editingId}`, { method: 'PATCH', body: JSON.stringify(body) })
      : () => api('tasks', { method: 'POST', body: JSON.stringify({ ...body, completed: false }) });
    await run(call, wasEditing ? 'Task updated' : 'Task added');
    editingId = null;
    $('task-form').reset();
    $('task-submit').textContent = 'Add task';
  });
  load();
}
init();
