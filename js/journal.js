// journal.js - Journalタブ（月カレンダー + Day View + CRUD）

import { todayStr, formatDate, generateId } from "./date-utils.js";
import { linkify } from "./url-utils.js";
import { getJournal, getGasUrl } from "./store.js";
import { gasGet, gasPost } from "./gas-client.js";
import { showToast, openModal, closeModal } from "./app.js";

let currentYear;
let currentMonth;
let currentDateStr = null;
let viewMode = "calendar";
let journalDates = {};
let dayEntries = [];

// --- Public API (app.js interface) ---

export function render(container) {
  if (viewMode === "calendar") {
    renderCalendar(container);
  } else {
    renderDayView(container);
  }
}

export function onActivate() {
  if (!currentYear) {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
  }
  loadMonthDots();
}

// --- Calendar View ---

function renderCalendar(container) {
  viewMode = "calendar";
  container = container || document.getElementById("tab-content");

  const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const today = todayStr();
  const weekLabels = ["日", "月", "火", "水", "木", "金", "土"];

  let html = '<div class="journal-calendar">';
  html += '<div class="cal-nav">';
  html += '<button class="cal-nav-btn" id="cal-prev">&lt;</button>';
  html += `<span class="cal-title">${currentYear}年${currentMonth + 1}月</span>`;
  html += '<button class="cal-nav-btn" id="cal-next">&gt;</button>';
  html += "</div>";

  html += '<div class="cal-grid">';
  for (const label of weekLabels) {
    html += `<div class="cal-header">${label}</div>`;
  }
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="cal-cell empty"></div>';
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = dateStr === today;
    const hasDot = journalDates[dateStr] && journalDates[dateStr] > 0;
    const classes = ["cal-cell"];
    if (isToday) classes.push("today");

    html += `<div class="${classes.join(" ")}" data-date="${dateStr}">`;
    html += `<span class="cal-day">${d}</span>`;
    if (hasDot) html += '<span class="cal-dot"></span>';
    html += "</div>";
  }
  html += "</div></div>";

  container.innerHTML = html;

  document.getElementById("cal-prev").addEventListener("click", () => {
    if (currentMonth === 0) {
      currentYear--;
      currentMonth = 11;
    } else {
      currentMonth--;
    }
    loadMonthDots();
    renderCalendar(container);
  });

  document.getElementById("cal-next").addEventListener("click", () => {
    if (currentMonth === 11) {
      currentYear++;
      currentMonth = 0;
    } else {
      currentMonth++;
    }
    loadMonthDots();
    renderCalendar(container);
  });

  container.querySelectorAll(".cal-cell:not(.empty)").forEach((cell) => {
    cell.addEventListener("click", () => {
      const ds = cell.dataset.date;
      if (ds) {
        currentDateStr = ds;
        loadDayEntries(ds).then(() => {
          renderDayView(container);
        });
      }
    });
  });
}

// --- Day View ---

function renderDayView(container) {
  viewMode = "dayview";
  container = container || document.getElementById("tab-content");

  const entries = dayEntries.filter((e) => !e.deleted && e.deleted !== "TRUE");
  entries.sort((a, b) =>
    (String(a.time) || "").localeCompare(String(b.time) || ""),
  );

  const dateLabel = formatDateJP(currentDateStr);

  let html = '<div class="day-view">';
  html += '<div class="day-header">';
  html += '<button class="back-btn" id="day-back">&lt; 戻る</button>';
  html += `<span class="day-title">${dateLabel}</span>`;
  html += "</div>";

  html += '<div class="day-entries">';
  if (entries.length === 0) {
    html += '<p class="empty-msg">この日の記録はまだありません</p>';
  } else {
    for (const entry of entries) {
      html += `<div class="entry-card" data-id="${entry.id}">`;
      html += `<div class="entry-time">${entry.time || "--:--"}</div>`;
      html += `<div class="entry-content">${linkify(String(entry.content || ""))}</div>`;
      html += '<div class="entry-actions">';
      html += `<button class="entry-edit-btn" data-id="${entry.id}">編集</button>`;
      html += `<button class="entry-delete-btn" data-id="${entry.id}">削除</button>`;
      html += "</div></div>";
    }
  }
  html += "</div>";
  html += '<button class="add-entry-btn" id="add-entry">+ 追記する</button>';
  html += "</div>";

  container.innerHTML = html;

  document.getElementById("day-back").addEventListener("click", () => {
    renderCalendar(container);
  });

  document.getElementById("add-entry").addEventListener("click", () => {
    openEntryModal(null);
  });

  container.querySelectorAll(".entry-edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const entry = dayEntries.find((en) => en.id === btn.dataset.id);
      if (entry) openEntryModal(entry);
    });
  });

  container.querySelectorAll(".entry-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmDelete(btn.dataset.id);
    });
  });
}

// --- Modal: Add/Edit ---

function openEntryModal(existingEntry) {
  const isEdit = !!existingEntry;
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const html = `
    <div class="modal-title">
      <span>${isEdit ? "記録を編集" : "記録を追加"}</span>
      <button class="modal-close" data-action="close">×</button>
    </div>
    <div class="form-group">
      <label>時刻</label>
      <input type="time" id="entry-time" class="form-input" value="${isEdit ? existingEntry.time || defaultTime : defaultTime}">
    </div>
    <div class="form-group">
      <label>内容</label>
      <textarea id="entry-content" class="form-textarea" rows="6" placeholder="自由に記録...">${isEdit ? existingEntry.content || "" : ""}</textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="modal-save">${isEdit ? "更新" : "保存"}</button>
    </div>
  `;

  openModal(html);

  document
    .querySelector('[data-action="close"]')
    .addEventListener("click", closeModal);

  document.getElementById("modal-save").addEventListener("click", async () => {
    const time = document.getElementById("entry-time").value;
    const content = document.getElementById("entry-content").value.trim();

    if (!content) {
      showToast("内容を入力してください", "error");
      return;
    }

    const item = {
      id: isEdit ? existingEntry.id : generateId(),
      date: currentDateStr,
      time: time,
      content: content,
    };

    if (!isEdit) {
      item.deleted = "FALSE";
    }

    // ローカル更新
    if (isEdit) {
      const idx = dayEntries.findIndex((e) => e.id === item.id);
      if (idx >= 0) dayEntries[idx] = { ...dayEntries[idx], ...item };
    } else {
      dayEntries.push(item);
    }

    // GAS同期
    const url = getGasUrl();
    if (url) {
      try {
        await gasPost(url, { type: "journal_upsert", item: item });
        showToast(isEdit ? "更新しました" : "保存しました", "success");
      } catch (e) {
        showToast("ローカル保存済み（同期は次回更新時）", "warn");
      }
    } else {
      showToast("ローカル保存済み", "info");
    }

    // ドット更新
    if (!isEdit) {
      journalDates[currentDateStr] = (journalDates[currentDateStr] || 0) + 1;
    }

    closeModal();
    renderDayView();
  });
}

// --- Modal: Delete ---

function confirmDelete(entryId) {
  const html = `
    <div class="modal-title">
      <span>削除確認</span>
      <button class="modal-close" data-action="close">×</button>
    </div>
    <p style="padding:16px">この記録を削除しますか？</p>
    <div class="btn-row">
      <button class="btn" id="modal-cancel">キャンセル</button>
      <button class="btn btn-danger" id="modal-confirm-delete">削除</button>
    </div>
  `;

  openModal(html);

  document
    .querySelector('[data-action="close"]')
    .addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);

  document
    .getElementById("modal-confirm-delete")
    .addEventListener("click", async () => {
      // ローカル更新
      const idx = dayEntries.findIndex((e) => e.id === entryId);
      if (idx >= 0) dayEntries[idx].deleted = "TRUE";

      // GAS同期
      const url = getGasUrl();
      if (url) {
        try {
          await gasPost(url, { type: "journal_delete", id: entryId });
          showToast("削除しました", "success");
        } catch (e) {
          showToast("ローカル削除済み（同期は次回更新時）", "warn");
        }
      }

      // ドット更新
      if (journalDates[currentDateStr]) {
        journalDates[currentDateStr]--;
      }

      closeModal();
      renderDayView();
    });
}

// --- Data Loading ---

async function loadMonthDots() {
  const url = getGasUrl();
  if (!url) return;
  const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  try {
    const result = await gasGet(url, { type: "journal", month: ym });
    if (result.success && result.data && result.data.dates) {
      journalDates = result.data.dates;
      // 現在calendarが表示中なら再描画
      if (viewMode === "calendar") {
        const container = document.getElementById("tab-content");
        renderCalendar(container);
      }
    }
  } catch (e) {
    // サイレント失敗（ローカルキャッシュで動作）
  }
}

async function loadDayEntries(dateStr) {
  const url = getGasUrl();
  if (!url) {
    dayEntries = [];
    return;
  }
  try {
    const result = await gasGet(url, { type: "journal", date: dateStr });
    if (result.success && result.data) {
      dayEntries = result.data.journal || result.data.entries || [];
    } else {
      dayEntries = [];
    }
  } catch (e) {
    dayEntries = [];
  }
}

// --- Utility ---

function formatDateJP(dateStr) {
  const parts = dateStr.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekdays[d.getDay()]})`;
}
