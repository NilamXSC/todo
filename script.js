// ===== Constants / Storage Keys =====
const STORAGE_KEY = "arcadia_todos_v1";
const USER_KEY = "arcadia_user_v1";

// Try to keep portrait on supported contexts; ignore failures gracefully
(function tryLockOrientation() {
  if (screen?.orientation?.lock) {
    screen.orientation.lock("portrait").catch(() => {});
  }
})();

// ===== Helpers =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const saveTasks = (tasks) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
const loadTasks = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
};

const setUser = (name) => localStorage.setItem(USER_KEY, JSON.stringify({ name }));
const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};
const clearUser = () => localStorage.removeItem(USER_KEY);

// Escape text for safe HTML insertion
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ===== Global State =====
let tasks = loadTasks();
let filter = "all"; // 'all' | 'active' | 'completed'

// ===== UI: Auth area in navbar =====
function paintAuthArea() {
  const authArea = $("#authArea");
  if (!authArea) return;
  const user = getUser();
  if (user?.name) {
    authArea.innerHTML = `
      <span class="hello">Hi, <b>${esc(user.name)}</b></span>
      <button class="btn ghost" id="signOutBtn">Sign Out</button>
    `;
    $("#signOutBtn")?.addEventListener("click", () => {
      clearUser();
      paintAuthArea();
    });
  } else {
    authArea.innerHTML = `
      <button class="btn ghost" onclick="location.href='auth.html'">Sign In</button>
      <button class="btn" onclick="location.href='auth.html'">Sign Up</button>
    `;
  }
}

// ===== Rendering (shared) =====
function filteredTasks(list = tasks, mode = filter) {
  if (mode === "active") return list.filter((t) => !t.completed);
  if (mode === "completed") return list.filter((t) => t.completed);
  return list;
}

function renderTaskList(container, list) {
  container.innerHTML = "";
  filteredTasks(list).forEach((t, idx) => {
    const li = document.createElement("li");
    li.className = `task-item ${t.completed ? "completed" : ""}`;
    li.dataset.id = t.id;

    li.innerHTML = `
      <div class="task-num">${idx + 1}</div>
      <div class="task-text">${esc(t.text)}</div>
      <div class="action-row">
        <button class="icon-btn done">${t.completed ? "Undo" : "Done"}</button>
        <button class="icon-btn del">Delete</button>
      </div>
    `;

    li.querySelector(".icon-btn.done").addEventListener("click", () => toggleComplete(t.id));
    li.querySelector(".icon-btn.del").addEventListener("click", () => removeTask(t.id));
    li.querySelector(".task-text").addEventListener("click", () => toggleComplete(t.id));

    container.appendChild(li);
  });
}

function renderSidebarPeek() {
  const list = $("#sidebarTaskList");
  const count = $("#taskCount");
  if (!list || !count) return;
  list.innerHTML = "";

  tasks.slice(0, 8).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t.text + (t.completed ? " ✓" : "");
    list.appendChild(li);
  });

  count.textContent = tasks.length;
}

// ===== CRUD =====
function addTask(text) {
  tasks.push({ id: Date.now().toString(), text, completed: false, createdAt: Date.now() });
  saveTasks(tasks);
  repaint();
}

function toggleComplete(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveTasks(tasks);
  repaint();
}

function removeTask(id) {
  tasks = tasks.filter((x) => x.id !== id);
  saveTasks(tasks);
  repaint();
}

function clearAll() {
  tasks = [];
  saveTasks(tasks);
  repaint();
}

function markAllDone() {
  tasks = tasks.map((t) => ({ ...t, completed: true }));
  saveTasks(tasks);
  repaint();
}

// ===== Page initializers =====
function initIndexPage() {
  const sidebar = $("#sidebar");
  $("#menuToggle")?.addEventListener("click", () => sidebar?.classList.toggle("open"));

  // Input + add
  const input = $("#taskInput");
  const addBtn = $("#addTaskBtn");
  const list = $("#taskList");

  addBtn?.addEventListener("click", () => {
    const val = input.value.trim();
    if (!val) return;
    addTask(val);
    input.value = "";
    input.focus();
  });
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value.trim();
      if (!val) return;
      addTask(val);
      input.value = "";
    }
  });

  // Filters
  $$(".filters .chip").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".filters .chip").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      filter = b.dataset.filter;
      renderTaskList(list, tasks);
    })
  );

  // Clear all
  $("#clearAllBtn")?.addEventListener("click", () => {
    if (confirm("Clear all tasks?")) clearAll();
  });

  // Initial paint
  renderTaskList(list, tasks);
  renderSidebarPeek();
}

function initMyTasksPage() {
  const list = $("#allTasksList");

  // Filters
  $$(".filters .chip").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".filters .chip").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      filter = b.dataset.filter;
      renderTaskList(list, tasks);
    })
  );

  // Bulk actions
  $$("[data-bulk='markAll']").forEach((b) => b.addEventListener("click", markAllDone));
  $$("[data-bulk='clearAll']").forEach((b) =>
    b.addEventListener("click", () => {
      if (confirm("Clear all tasks?")) clearAll();
    })
  );

  renderTaskList(list, tasks);
}

function initAuthPage() {
  const signInTab = $("#signInTab");
  const signUpTab = $("#signUpTab");
  const signInForm = $("#signInForm");
  const signUpForm = $("#signUpForm");

  signInTab?.addEventListener("click", () => {
    signInTab.classList.add("active");
    signUpTab.classList.remove("active");
    signInForm.classList.remove("hidden");
    signUpForm.classList.add("hidden");
  });
  signUpTab?.addEventListener("click", () => {
    signUpTab.classList.add("active");
    signInTab.classList.remove("active");
    signUpForm.classList.remove("hidden");
    signInForm.classList.add("hidden");
  });

  signInForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#si-username").value.trim();
    if (!name) return;
    setUser(name);
    location.href = "index.html";
  });

  signUpForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#su-username").value.trim();
    if (!name) return;
    setUser(name);
    location.href = "index.html";
  });
}

// Repaint bits shared by pages
function repaint() {
  paintAuthArea();
  renderSidebarPeek();
  // repaint lists if present
  const mainList = $("#taskList");
  const allList = $("#allTasksList");
  if (mainList) renderTaskList(mainList, tasks);
  if (allList) renderTaskList(allList, tasks);
}

// ===== Boot =====
document.addEventListener("DOMContentLoaded", () => {
  // Show/Hide rotate overlay depending on orientation (for small screens)
  const rotate = $("#rotateOverlay");
  function checkRotate() {
    if (!rotate) return;
    const isSmall = window.matchMedia("(max-width: 812px)").matches;
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    rotate.style.display = isSmall && isLandscape ? "grid" : "none";
  }
  checkRotate();
  window.addEventListener("resize", checkRotate);
  window.addEventListener("orientationchange", checkRotate);

  paintAuthArea();

  // Page detection
  if ($("#taskList")) initIndexPage();
  if ($("#allTasksList")) initMyTasksPage();
  if ($("#signInForm") || $("#signUpForm")) initAuthPage();
});
