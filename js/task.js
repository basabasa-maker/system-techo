// task.js - Taskタブ完全実装

import {
  getTasks,
  saveTasks,
  syncTask,
  deleteTask as storeDeleteTask,
} from "./store.js";
import {
  todayStr,
  formatDate,
  formatDateTime,
  isOverdue,
  generateId,
} from "./date-utils.js";
import { showToast, openModal, closeModal } from "./app.js";

let container = null;
let filters = { status: "active", priority: "all", sort: "due" };

export function render(el) {
  container = el;
  container.innerHTML = "";

  const filterBar = document.createElement("div");
  filterBar.className = "filter-bar";
  filterBar.innerHTML = `
    <select id="filter-status" aria-label="ステータスフィルタ">
      <option value="all">全て</option>
      <option value="active" selected>進行中</option>
      <option value="completed">完了</option>
    </select>
    <select id="filter-priority" aria-label="優先度フィルタ">
      <option value="all" selected>全優先度</option>
      <option value="high">高</option>
      <option value="medium">中</option>
      <option value="low">低</option>
    </select>
    <select id="filter-sort" aria-label="ソート">
      <option value="due" selected>期限順</option>
      <option value="priority">優先度順</option>
    </select>
  `;
  container.appendChild(filterBar);

  filterBar.querySelector("#filter-status").value = filters.status;
  filterBar.querySelector("#filter-priority").value = filters.priority;
  filterBar.querySelector("#filter-sort").value = filters.sort;

  filterBar.querySelector("#filter-status").addEventListener("change", (e) => {
    filters.status = e.target.value;
    renderList();
  });
  filterBar
    .querySelector("#filter-priority")
    .addEventListener("change", (e) => {
      filters.priority = e.target.value;
      renderList();
    });
  filterBar.querySelector("#filter-sort").addEventListener("change", (e) => {
    filters.sort = e.target.value;
    renderList();
  });

  const listEl = document.createElement("div");
  listEl.id = "task-list";
  listEl.className = "task-list";
  container.appendChild(listEl);

  renderList();
  ensureFab();
}

export function onActivate() {
  if (container) renderList();
  ensureFab();
}

function getFilteredTasks() {
  let tasks = getTasks().filter((t) => !t.deleted);

  if (filters.status === "active") {
    tasks = tasks.filter((t) => t.status !== "completed");
  } else if (filters.status === "completed") {
    tasks = tasks.filter((t) => t.status === "completed");
  }

  if (filters.priority !== "all") {
    tasks = tasks.filter((t) => t.priority === filters.priority);
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  if (filters.sort === "due") {
    tasks.sort((a, b) => {
      const da = a.due || "9999-12-31";
      const db = b.due || "9999-12-31";
      if (da !== db) return da.localeCompare(db);
      return (
        (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
      );
    });
  } else {
    tasks.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      const da = a.due || "9999-12-31";
      const db = b.due || "9999-12-31";
      return da.localeCompare(db);
    });
  }

  return tasks;
}

function renderList() {
  const listEl = document.getElementById("task-list");
  if (!listEl) return;

  const tasks = getFilteredTasks();

  if (tasks.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div>タスクがありません</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = "";
  tasks.forEach((task) => {
    listEl.appendChild(createTaskCard(task));
  });
}

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className =
    "task-card" + (task.status === "completed" ? " completed" : "");
  card.dataset.id = task.id;

  const isComplete = task.status === "completed";
  const priorityLabel = { high: "高", medium: "中", low: "低" };
  const overdue = !isComplete && isOverdue(task.due);

  let dueDateHtml = "";
  if (task.due) {
    dueDateHtml = `<span class="due-date${overdue ? " overdue" : ""}">${task.due}</span>`;
  }

  const progressHtml = buildProgressBar(task.progress || 0);
  const shoppingHtml = task.shopping
    ? '<span class="shopping-tag">🛒</span>'
    : "";

  card.innerHTML = `
    <button class="task-check ${isComplete ? "checked" : ""}" data-action="toggle" aria-label="完了切替"></button>
    <div class="task-body" data-action="edit">
      <div class="task-title">${escapeHtml(task.title || "無題")}</div>
      <div class="task-meta">
        <span class="priority-badge ${task.priority || "low"}">${priorityLabel[task.priority] || "低"}</span>
        ${dueDateHtml}
        ${shoppingHtml}
      </div>
      ${progressHtml}
    </div>
  `;

  const checkBtn = card.querySelector('[data-action="toggle"]');
  checkBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleComplete(task.id);
  });

  const body = card.querySelector('[data-action="edit"]');
  body.addEventListener("click", () => {
    openTaskModal(task);
  });

  return card;
}

function buildProgressBar(progress) {
  const segments = [25, 50, 75, 100];
  let html = '<div class="progress-bar">';
  segments.forEach((seg) => {
    const filled = progress >= seg;
    const colorClass = filled ? "filled-" + seg : "";
    html += `<div class="seg ${colorClass}"></div>`;
  });
  html += "</div>";
  return html;
}

function toggleComplete(id) {
  const tasks = getTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  if (task.status !== "completed") {
    if (!confirm("「" + (task.title || "無題") + "」を完了にしますか？"))
      return;
    task.status = "completed";
    task.completedDate = todayStr();
  } else {
    task.status = "active";
    task.completedDate = "";
  }
  task.updated = formatDateTime(new Date());

  saveTasks(tasks);
  renderList();

  syncTask(task).then((res) => {
    if (res && !res.success) {
      showToast("同期失敗（ローカル保存済み）", "error");
    }
  });
}

function openTaskModal(existingTask) {
  const isEdit = !!existingTask;
  const task = existingTask || {
    id: generateId(),
    title: "",
    priority: "medium",
    due: "",
    progress: 0,
    status: "active",
    note: "",
    shopping: false,
    created: formatDateTime(new Date()),
    updated: formatDateTime(new Date()),
    completedDate: "",
    deleted: false,
  };

  const html = `
    <div class="modal-title">
      <span>${isEdit ? "タスク編集" : "新規タスク"}</span>
      <button class="modal-close" data-action="close">×</button>
    </div>
    <div class="form-group">
      <label for="task-title">タイトル</label>
      <input type="text" id="task-title" value="${escapeHtml(task.title)}" placeholder="タスク名を入力">
    </div>
    <div class="form-group">
      <label for="task-priority">優先度</label>
      <select id="task-priority">
        <option value="high" ${task.priority === "high" ? "selected" : ""}>高</option>
        <option value="medium" ${task.priority === "medium" ? "selected" : ""}>中</option>
        <option value="low" ${task.priority === "low" ? "selected" : ""}>低</option>
      </select>
    </div>
    <div class="form-group">
      <label for="task-due">期限</label>
      <input type="date" id="task-due" value="${task.due || ""}">
    </div>
    <div class="form-group">
      <label>進捗</label>
      <div class="progress-selector" id="progress-selector">
        <button class="seg-btn ${task.progress === 0 ? "active" : ""}" data-val="0" type="button">0%</button>
        <button class="seg-btn ${task.progress === 25 ? "active" : ""}" data-val="25" type="button">25%</button>
        <button class="seg-btn ${task.progress === 50 ? "active" : ""}" data-val="50" type="button">50%</button>
        <button class="seg-btn ${task.progress === 75 ? "active" : ""}" data-val="75" type="button">75%</button>
        <button class="seg-btn ${task.progress === 100 ? "active" : ""}" data-val="100" type="button">100%</button>
      </div>
    </div>
    <div class="form-group">
      <label for="task-note">メモ</label>
      <textarea id="task-note" placeholder="メモを入力">${escapeHtml(task.note || "")}</textarea>
    </div>
    <div class="form-group">
      <div class="checkbox-row">
        <input type="checkbox" id="task-shopping" ${task.shopping ? "checked" : ""}>
        <label for="task-shopping">買い物リスト</label>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="task-save">保存</button>
      ${isEdit ? '<button class="btn btn-danger" id="task-delete">削除</button>' : ""}
    </div>
  `;

  openModal(html);

  let currentProgress = task.progress || 0;

  document
    .querySelector('[data-action="close"]')
    .addEventListener("click", closeModal);

  document
    .getElementById("progress-selector")
    .addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn) return;
      currentProgress = parseInt(btn.dataset.val, 10);
      document
        .querySelectorAll("#progress-selector .seg-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });

  document.getElementById("task-save").addEventListener("click", () => {
    const title = document.getElementById("task-title").value.trim();
    if (!title) {
      showToast("タイトルを入力してください", "error");
      return;
    }

    task.title = title;
    task.priority = document.getElementById("task-priority").value;
    task.due = document.getElementById("task-due").value;
    task.progress = currentProgress;
    task.note = document.getElementById("task-note").value;
    task.shopping = document.getElementById("task-shopping").checked;
    task.updated = formatDateTime(new Date());

    if (currentProgress === 100 && task.status !== "completed") {
      task.status = "completed";
      task.completedDate = todayStr();
    } else if (currentProgress < 100 && task.status === "completed") {
      task.status = "active";
      task.completedDate = "";
    }

    const tasks = getTasks();
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    saveTasks(tasks);
    closeModal();
    renderList();
    showToast("保存しました", "success");

    syncTask(task).then((res) => {
      if (res && !res.success) {
        showToast("同期失敗（ローカル保存済み）", "error");
      }
    });
  });

  if (isEdit) {
    document.getElementById("task-delete").addEventListener("click", () => {
      if (!confirm("このタスクを削除しますか？")) return;

      task.deleted = true;
      task.updated = formatDateTime(new Date());

      const tasks = getTasks();
      const idx = tasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        tasks[idx] = task;
      }
      saveTasks(tasks);
      closeModal();
      renderList();
      showToast("削除しました", "info");

      storeDeleteTask(task.id).then((res) => {
        if (res && !res.success) {
          showToast("同期失敗（ローカル削除済み）", "error");
        }
      });
    });
  }
}

function ensureFab() {
  let fab = document.getElementById("task-fab");
  if (!fab) {
    fab = document.createElement("button");
    fab.id = "task-fab";
    fab.className = "fab";
    fab.textContent = "+";
    fab.setAttribute("aria-label", "新規タスク");
    fab.addEventListener("click", () => openTaskModal(null));
    document.body.appendChild(fab);
  }
  fab.style.display = "flex";
}

export function hideFab() {
  const fab = document.getElementById("task-fab");
  if (fab) fab.style.display = "none";
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
