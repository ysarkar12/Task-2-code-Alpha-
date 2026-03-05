let state = {
  tasks: [],
  members: [],
  currentUser: null
};

function saveState() {
  localStorage.setItem('tms_state', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('tms_state');
  if (raw) {
    try { state = JSON.parse(raw); } catch (e) { state = {tasks:[],members:[],currentUser:null}; }
  }
}

function showAuth() {
  const name = prompt('Enter your name to sign in');
  if (name && name.trim()) {
    state.currentUser = name.trim();
    if (!state.members.includes(state.currentUser)) state.members.push(state.currentUser);
    saveState();
    updateAuthUI();
    renderMembers();
    populateAssigneeSelect();
  }
}

function signOut() {
  state.currentUser = null;
  saveState();
  updateAuthUI();
}

function updateAuthUI() {
  const cur = document.getElementById('currentUser');
  const signin = document.getElementById('signinBtn');
  const signout = document.getElementById('signoutBtn');
  if (state.currentUser) {
    cur.textContent = 'Signed in: ' + state.currentUser;
    signin.style.display = 'none';
    signout.style.display = 'inline-block';
  } else {
    cur.textContent = 'Not signed in';
    signin.style.display = 'inline-block';
    signout.style.display = 'none';
  }
}

function addMember() {
  const name = document.getElementById('memberName').value.trim();
  if (!name) return alert('Enter a member name');
  if (!state.members.includes(name)) state.members.push(name);
  document.getElementById('memberName').value = '';
  saveState();
  renderMembers();
  populateAssigneeSelect();
}

function renderMembers() {
  const container = document.getElementById('memberList');
  container.innerHTML = '';
  state.members.forEach(m => {
    const el = document.createElement('div');
    el.className = 'member-item';
    el.textContent = m;
    container.appendChild(el);
  });
}

function populateAssigneeSelect() {
  const sel = document.getElementById('assigneeSelect');
  sel.innerHTML = '<option value="">Unassigned</option>';
  state.members.forEach(m => {
    const o = document.createElement('option');
    o.value = m; o.textContent = m;
    sel.appendChild(o);
  });
}

function addTask() {
  const title = document.getElementById('taskInput').value.trim();
  const due = document.getElementById('taskTime').value;
  const assignee = document.getElementById('assigneeSelect').value;
  const status = document.getElementById('statusSelect').value || 'pending';

  if (!title) return alert('Please enter a task title');

  const task = {
    id: Date.now().toString(),
    title,
    assignee: assignee || null,
    status,
    due: due || null,
    createdBy: state.currentUser || 'anonymous',
    createdAt: new Date().toISOString()
  };

  state.tasks.push(task);
  saveState();
  document.getElementById('taskInput').value = '';
  document.getElementById('taskTime').value = '';
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  state.tasks.sort((a,b)=> (a.due||'') > (b.due||'') ? 1 : -1);

  state.tasks.forEach((task) => {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'task-info';
    const dueText = task.due ? new Date(task.due).toLocaleString() : 'No due';
    info.innerHTML = `<strong>${escapeHtml(task.title)}</strong><br/><small>Assignee: ${task.assignee||'—'} • Due: ${dueText}</small>`;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const statusSel = document.createElement('select');
    ['pending','in-progress','completed'].forEach(s=>{
      const o = document.createElement('option'); o.value = s; o.textContent = s; if (task.status===s) o.selected = true; statusSel.appendChild(o);
    });
    statusSel.onchange = () => { task.status = statusSel.value; saveState(); renderTasks(); };

    const editBtn = document.createElement('button'); editBtn.textContent = 'Edit';
    editBtn.onclick = () => { const t = prompt('Edit title', task.title); if (t!==null){ task.title = t; saveState(); renderTasks(); } };

    const delBtn = document.createElement('button'); delBtn.textContent = 'Delete';
    delBtn.onclick = () => { if (confirm('Delete task?')) { state.tasks = state.tasks.filter(x=>x.id!==task.id); saveState(); renderTasks(); } };

    meta.appendChild(statusSel);
    meta.appendChild(editBtn);
    meta.appendChild(delBtn);

    if (task.status === 'completed') info.classList.add('completed');

    li.appendChild(info);
    li.appendChild(meta);
    list.appendChild(li);
  });
}

function checkDeadlines() {
  const now = Date.now();
  state.tasks.forEach(task => {
    if (!task.due) return;
    if (task.status === 'completed') return;
    const dueTs = new Date(task.due).getTime();
    const diff = dueTs - now;
    if (diff <= 0) {
      notify(`Task overdue: ${task.title}`);
    } else if (diff <= 1000*60*60) { // due within 1 hour
      notify(`Task due within 1 hour: ${task.title}`);
    }
  });
}

function notify(message) {
  // show lightweight banner
  showBanner(message);
  if (window.Notification && Notification.permission === 'granted') {
    new Notification('Task Reminder', { body: message });
  }
}

let bannerTimer = null;
function showBanner(msg) {
  let b = document.getElementById('reminderBanner');
  if (!b) {
    b = document.createElement('div'); b.id = 'reminderBanner'; b.className = 'banner'; document.body.prepend(b);
  }
  b.textContent = msg;
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(()=>{ if(b) b.remove(); bannerTimer = null; }, 7000);
}

function escapeHtml(s){ return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"})[c]); }

document.addEventListener('DOMContentLoaded', ()=>{
  loadState();
  updateAuthUI();
  renderMembers();
  populateAssigneeSelect();
  renderTasks();
  if (window.Notification && Notification.permission !== 'granted') Notification.requestPermission();
  checkDeadlines();
  setInterval(checkDeadlines, 60*1000);
});
