// note.js - Noteタブ（通常ノート + 後で読むリスト）

import { generateId, formatDateTime } from "./date-utils.js";
import { linkify } from "./url-utils.js";
import { getNotes, getGasUrl } from "./store.js";
import { gasGet, gasPost } from "./gas-client.js";
import { showToast, openModal, closeModal } from "./app.js";

let allNotes = [];
let searchQuery = "";
let sortOrder = "desc";
let loading = false;

// --- Public API (app.js interface) ---

export function render(container) {
  renderNoteList(container);
}

export function onActivate() {
  allNotes = getNotes();
  // GAS呼び出しはしない。更新ボタン押下時のみpullAllで取得
}

// 更新ボタン押下時にapp.jsから呼ばれる
export async function refresh() {
  allNotes = getNotes();
  rerenderList();
}

// --- Data Loading ---

async function loadNotesFromGAS() {
  const url = getGasUrl();
  if (!url) return;
  loading = true;
  rerenderList();
  try {
    const result = await gasGet(url, { type: "notes" });
    if (result.success && result.data && result.data.notes) {
      allNotes = result.data.notes;
      localStorage.setItem("system-techo-v2-notes", JSON.stringify(allNotes));
    }
  } catch (e) {
    // ローカルキャッシュで動作
  } finally {
    loading = false;
    rerenderList();
  }
}

function rerenderList() {
  const container = document.getElementById("tab-content");
  if (container) renderNoteList(container);
}

// --- Filtering & Sorting ---

function getFilteredNotes() {
  // readlaterは別アプリ（ニュース）連携で扱うため、ノートタブでは表示しない
  let notes = allNotes.filter(
    (n) => !n.deleted && n.deleted !== "TRUE" && n.type !== "readlater",
  );

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    notes = notes.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q),
    );
  }

  const sortFn =
    sortOrder === "desc"
      ? (a, b) => (b.created || "").localeCompare(a.created || "")
      : (a, b) => (a.created || "").localeCompare(b.created || "");

  // Pinned first
  const pinnedSort = (a, b) => {
    const ap = a.pinned === true || a.pinned === "TRUE" ? 1 : 0;
    const bp = b.pinned === true || b.pinned === "TRUE" ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return sortFn(a, b);
  };

  notes.sort(pinnedSort);
  return notes;
}

function isPinned(note) {
  return note.pinned === true || note.pinned === "TRUE";
}

function isRead(note) {
  return note.read === true || note.read === "TRUE";
}

// --- Main Render ---

function renderNoteList(container) {
  const notes = getFilteredNotes();

  let html = '<div class="note-container">';

  // Search bar (sticky)
  html += '<div class="note-search-bar">';
  html += `<input type="text" class="note-search-input" id="note-search" placeholder="検索..." value="${escapeAttr(searchQuery)}">`;
  html += '<div class="note-toolbar">';
  html += `<button class="note-sort-btn" id="note-sort">${sortOrder === "desc" ? "新しい順" : "古い順"}</button>`;
  html += '<button class="note-add-btn" id="note-add-normal">+ ノート</button>';
  html += "</div></div>";

  // Loading
  if (loading) {
    html += '<div class="loading-indicator">読み込み中...</div>';
  }

  // Notes
  if (notes.length === 0 && !loading) {
    html += '<p class="note-empty-msg">ノートはまだありません</p>';
  } else {
    html += '<div class="note-list">';
    for (const note of notes) {
      html += renderNoteCard(note);
    }
    html += "</div>";
  }

  html += "</div>";
  container.innerHTML = html;

  // --- Event Bindings ---
  bindSearchEvents(container);
  bindSortEvent(container);
  bindAddEvents(container);
  bindCardEvents(container);
}

// --- Card Renderers ---

function renderNoteCard(note) {
  const pinned = isPinned(note);
  const read = isRead(note);
  const classes = ["note-card"];
  if (pinned) classes.push("note-pinned");
  if (read) classes.push("note-read");

  let html = `<div class="${classes.join(" ")}" data-id="${note.id}">`;
  html += '<div class="note-card-header">';
  html += `<button class="note-pin-btn" data-id="${note.id}" title="ピン留め">${pinned ? "&#128204;" : "&#128203;"}</button>`;
  html += `<button class="note-read-btn" data-id="${note.id}" title="既読チェック">${read ? "&#9745;" : "&#9744;"}</button>`;
  html += `<span class="note-card-title">${escapeHtml(note.title || "（無題）")}</span>`;
  html += "</div>";

  // Content preview (collapsible)
  if (note.content) {
    html += `<div class="note-card-content note-collapsed" data-id="${note.id}">${linkify(String(note.content))}</div>`;
  }

  html += `<div class="note-card-date">${formatCreated(note.created)}</div>`;
  html += '<div class="note-card-actions">';
  html += `<button class="note-edit-btn" data-id="${note.id}">編集</button>`;
  html += `<button class="note-delete-btn" data-id="${note.id}">削除</button>`;
  html += "</div></div>";
  return html;
}

// --- Event Binding ---

function bindSearchEvents(container) {
  const input = container.querySelector("#note-search");
  if (!input) return;
  input.addEventListener("input", () => {
    searchQuery = input.value;
    rerenderList();
    // Re-focus and restore cursor position
    const newInput = document.getElementById("note-search");
    if (newInput) {
      newInput.focus();
      newInput.setSelectionRange(newInput.value.length, newInput.value.length);
    }
  });
}

function bindSortEvent(container) {
  const btn = container.querySelector("#note-sort");
  if (!btn) return;
  btn.addEventListener("click", () => {
    sortOrder = sortOrder === "desc" ? "asc" : "desc";
    rerenderList();
  });
}

function bindAddEvents(container) {
  const addNormal = container.querySelector("#note-add-normal");
  if (addNormal) {
    addNormal.addEventListener("click", () => openNoteModal(null, "normal"));
  }
}

function bindCardEvents(container) {
  // Toggle content collapse
  container.querySelectorAll(".note-card-content").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.tagName === "A") return;
      el.classList.toggle("note-collapsed");
    });
  });

  // Pin toggle
  container.querySelectorAll(".note-pin-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePin(btn.dataset.id);
    });
  });

  // Read toggle
  container.querySelectorAll(".note-read-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleRead(btn.dataset.id);
    });
  });

  // Edit
  container.querySelectorAll(".note-edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const note = allNotes.find((n) => n.id === btn.dataset.id);
      if (note) openNoteModal(note, note.type || "normal");
    });
  });

  // Delete
  container.querySelectorAll(".note-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmDelete(btn.dataset.id);
    });
  });
}

// --- Toggle Actions ---

async function togglePin(noteId) {
  const note = allNotes.find((n) => n.id === noteId);
  if (!note) return;

  const newVal = isPinned(note) ? "FALSE" : "TRUE";
  note.pinned = newVal;
  updateLocal();
  rerenderList();

  await syncNote(note);
}

async function toggleRead(noteId) {
  const note = allNotes.find((n) => n.id === noteId);
  if (!note) return;

  const newVal = isRead(note) ? "FALSE" : "TRUE";
  note.read = newVal;
  if (newVal === "TRUE") {
    const now = new Date();
    note.readAt = formatDateTime(now);
  } else {
    note.readAt = "";
  }
  updateLocal();
  rerenderList();

  await syncNote(note);
}

// --- Modal: Add/Edit ---

function openNoteModal(existingNote, noteType) {
  const isEdit = !!existingNote;
  const isReadlater = noteType === "readlater";
  const modalTitle = isEdit
    ? isReadlater
      ? "後で読むを編集"
      : "ノートを編集"
    : isReadlater
      ? "後で読むを追加"
      : "ノートを追加";

  let html = `
    <div class="modal-title">
      <span>${modalTitle}</span>
      <button class="modal-close" data-action="close">×</button>
    </div>
    <div class="form-group">
      <label>タイトル</label>
      <input type="text" id="note-modal-title" class="form-input" value="${escapeAttr(isEdit ? existingNote.title || "" : "")}" placeholder="タイトルを入力...">
    </div>`;

  if (isReadlater) {
    html += `
    <div class="form-group">
      <label>URL</label>
      <input type="text" id="note-modal-url" class="form-input" value="${escapeAttr(isEdit ? existingNote.url || "" : "")}" placeholder="https://...">
    </div>
    <div class="form-group">
      <label>ソース</label>
      <input type="text" id="note-modal-source" class="form-input" value="${escapeAttr(isEdit ? existingNote.source || "" : "")}" placeholder="記事の出典など">
    </div>`;
  } else {
    html += `
    <div class="form-group">
      <label>内容</label>
      <textarea id="note-modal-content" class="form-textarea" rows="8" placeholder="メモを入力...">${isEdit ? existingNote.content || "" : ""}</textarea>
    </div>
    <div class="form-group">
      <label>URL（任意）</label>
      <input type="text" id="note-modal-url" class="form-input" value="${escapeAttr(isEdit ? existingNote.url || "" : "")}" placeholder="https://...">
    </div>`;
  }

  html += `
    <div class="btn-row">
      <button class="btn btn-primary" id="note-modal-save">${isEdit ? "更新" : "保存"}</button>
    </div>`;

  openModal(html);

  document
    .querySelector('[data-action="close"]')
    .addEventListener("click", closeModal);

  document
    .getElementById("note-modal-save")
    .addEventListener("click", async () => {
      const title = document.getElementById("note-modal-title").value.trim();
      const urlEl = document.getElementById("note-modal-url");
      const contentEl = document.getElementById("note-modal-content");
      const sourceEl = document.getElementById("note-modal-source");

      const noteUrl = urlEl ? urlEl.value.trim() : "";
      const content = contentEl ? contentEl.value.trim() : "";
      const source = sourceEl ? sourceEl.value.trim() : "";

      if (!title && !content && !noteUrl) {
        showToast("タイトルまたは内容を入力してください", "error");
        return;
      }

      const now = new Date();
      const nowStr = formatDateTime(now);

      const item = {
        id: isEdit ? existingNote.id : generateId(),
        type: noteType,
        title: title,
        content: content,
        url: noteUrl,
        source: source,
        pinned: isEdit ? existingNote.pinned || "FALSE" : "FALSE",
        read: isEdit ? existingNote.read || "FALSE" : "FALSE",
        readAt: isEdit ? existingNote.readAt || "" : "",
        created: isEdit ? existingNote.created || nowStr : nowStr,
        updated: nowStr,
        deleted: "FALSE",
      };

      // ローカル更新
      if (isEdit) {
        const idx = allNotes.findIndex((n) => n.id === item.id);
        if (idx >= 0) allNotes[idx] = item;
      } else {
        allNotes.push(item);
      }
      updateLocal();

      // GAS同期
      const gasUrl = getGasUrl();
      if (gasUrl) {
        try {
          await gasPost(gasUrl, { type: "note_upsert", item: item });
          showToast(isEdit ? "更新しました" : "保存しました", "success");
        } catch (e) {
          showToast("ローカル保存済み（同期は次回更新時）", "warn");
        }
      } else {
        showToast("ローカル保存済み", "info");
      }

      closeModal();
      rerenderList();
    });
}

// --- Modal: Delete ---

function confirmDelete(noteId) {
  const html = `
    <div class="modal-title">
      <span>削除確認</span>
      <button class="modal-close" data-action="close">×</button>
    </div>
    <p style="padding:16px">このノートを削除しますか？</p>
    <div class="btn-row">
      <button class="btn" id="note-modal-cancel">キャンセル</button>
      <button class="btn btn-danger" id="note-modal-confirm-delete">削除</button>
    </div>
  `;

  openModal(html);

  document
    .querySelector('[data-action="close"]')
    .addEventListener("click", closeModal);
  document
    .getElementById("note-modal-cancel")
    .addEventListener("click", closeModal);

  document
    .getElementById("note-modal-confirm-delete")
    .addEventListener("click", async () => {
      const idx = allNotes.findIndex((n) => n.id === noteId);
      if (idx >= 0) allNotes[idx].deleted = "TRUE";
      updateLocal();

      const gasUrl = getGasUrl();
      if (gasUrl) {
        try {
          await gasPost(gasUrl, { type: "note_delete", id: noteId });
          showToast("削除しました", "success");
        } catch (e) {
          showToast("ローカル削除済み（同期は次回更新時）", "warn");
        }
      }

      closeModal();
      rerenderList();
    });
}

// --- Helpers ---

async function syncNote(note) {
  const gasUrl = getGasUrl();
  if (!gasUrl) return;
  try {
    await gasPost(gasUrl, { type: "note_upsert", item: note });
  } catch (e) {
    // サイレント失敗
  }
}

function updateLocal() {
  localStorage.setItem("system-techo-v2-notes", JSON.stringify(allNotes));
}

function formatCreated(str) {
  if (!str) return "";
  // "2026-04-10 14:30:00" → "4/10 14:30"
  const parts = str.split(" ");
  if (parts.length < 2) return str;
  const dateParts = parts[0].split("-");
  if (dateParts.length < 3) return str;
  const timeParts = parts[1].split(":");
  return (
    Number(dateParts[1]) +
    "/" +
    Number(dateParts[2]) +
    " " +
    timeParts[0] +
    ":" +
    timeParts[1]
  );
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
