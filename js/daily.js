// daily.js - Dailyタブ（カレンダー予定 + 今日のタスク）

import { todayStr, formatDate } from "./date-utils.js";
import { linkify } from "./url-utils.js";
import { getTasks, getGasUrl } from "./store.js";
import { gasGet } from "./gas-client.js";
import { showToast } from "./app.js";

let currentDateStr = null;
let calendarEvents = [];
let loading = false;

// --- Public API (app.js interface) ---

export function render(container) {
  if (!currentDateStr) {
    currentDateStr = todayStr();
  }
  renderDaily(container);
}

export function onActivate() {
  if (!currentDateStr) {
    currentDateStr = todayStr();
  }
  loadCalendarEvents(currentDateStr);
}

// --- Main Render ---

function renderDaily(container) {
  container = container || document.getElementById("tab-content");

  const dateLabel = formatDateJP(currentDateStr);
  const isToday = currentDateStr === todayStr();

  let html = '<div class="daily-container">';

  // Date Navigation
  html += '<div class="daily-nav">';
  html += '<button class="daily-nav-btn" id="daily-prev">&lt;</button>';
  html += '<div class="daily-nav-center">';
  html += `<span class="daily-date-label">${dateLabel}</span>`;
  if (!isToday) {
    html += '<button class="daily-today-btn" id="daily-today">today</button>';
  }
  html += "</div>";
  html += '<button class="daily-nav-btn" id="daily-next">&gt;</button>';
  html += "</div>";

  // Calendar Events Section
  html += '<div class="daily-section">';
  html += '<div class="daily-section-title">Googleカレンダー</div>';

  if (loading) {
    html += '<div class="loading-indicator">読み込み中...</div>';
  } else if (calendarEvents.length === 0) {
    html += '<p class="empty-msg">予定はありません</p>';
  } else {
    // Split: all-day events first, then timed events sorted by startTime
    const allDay = calendarEvents.filter(function (e) {
      return e.isAllDay;
    });
    const timed = calendarEvents.filter(function (e) {
      return !e.isAllDay;
    });
    timed.sort(function (a, b) {
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

    const sorted = allDay.concat(timed);

    html += '<div class="daily-events">';
    for (const ev of sorted) {
      html += renderEventCard(ev);
    }
    html += "</div>";
  }
  html += "</div>";

  // Today's Tasks Section
  html += '<div class="daily-section">';
  html += '<div class="daily-section-title">関連タスク</div>';
  html += renderTodayTasks();
  html += "</div>";

  html += "</div>";

  container.innerHTML = html;

  // Event listeners
  document.getElementById("daily-prev").addEventListener("click", function () {
    navigateDate(-1);
    renderDaily(container);
  });

  document.getElementById("daily-next").addEventListener("click", function () {
    navigateDate(1);
    renderDaily(container);
  });

  var todayBtn = document.getElementById("daily-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", function () {
      currentDateStr = todayStr();
      loadCalendarEvents(currentDateStr);
      renderDaily(container);
    });
  }
}

// --- Event Card ---

function renderEventCard(ev) {
  var timeDisplay = "";
  if (ev.isAllDay) {
    timeDisplay = "all day";
  } else {
    timeDisplay = ev.startTime || "";
    if (ev.endTime) {
      timeDisplay += " - " + ev.endTime;
    }
  }

  var locationHtml = "";
  if (ev.location) {
    locationHtml =
      '<div class="daily-event-location">' +
      linkify(String(ev.location)) +
      "</div>";
  }

  var calLabel = "";
  if (ev.calendarName) {
    calLabel =
      '<span class="daily-event-cal">' +
      escapeHtml(ev.calendarName) +
      "</span>";
  }

  var html = '<div class="daily-event-card">';
  html += '<div class="daily-event-time">' + escapeHtml(timeDisplay) + "</div>";
  html += '<div class="daily-event-body">';
  html +=
    '<div class="daily-event-title">' +
    escapeHtml(ev.title || "(no title)") +
    "</div>";
  html += locationHtml;
  html += calLabel;
  html += "</div>";
  html += "</div>";
  return html;
}

// --- Today's Tasks ---

function renderTodayTasks() {
  var tasks = getTasks();
  var today = todayStr();

  // Filter: active tasks that are due today or overdue
  var relevant = tasks.filter(function (t) {
    if (t.status === "completed" || t.deleted === "TRUE") return false;
    if (!t.due) return false;
    return t.due <= currentDateStr;
  });

  // Sort: overdue first, then by due date
  relevant.sort(function (a, b) {
    return (a.due || "").localeCompare(b.due || "");
  });

  if (relevant.length === 0) {
    return '<p class="empty-msg">関連タスクはありません</p>';
  }

  var html = '<div class="daily-tasks">';
  for (var i = 0; i < relevant.length; i++) {
    var t = relevant[i];
    var isOverdue = t.due < currentDateStr;
    var dueLabel = isOverdue ? "期限超過" : "今日";
    var dueClass = isOverdue ? "daily-task-overdue" : "daily-task-today";

    html += '<div class="daily-task-card">';
    html +=
      '<span class="daily-task-badge ' + dueClass + '">' + dueLabel + "</span>";
    html +=
      '<span class="daily-task-title">' + escapeHtml(t.title || "") + "</span>";
    html += "</div>";
  }
  html += "</div>";
  return html;
}

// --- Data Loading ---

async function loadCalendarEvents(dateStr) {
  var url = getGasUrl();
  if (!url) {
    calendarEvents = [];
    return;
  }

  loading = true;
  showToast("カレンダー取得中...", "info");

  // Re-render to show loading state
  var container = document.getElementById("tab-content");
  renderDaily(container);

  try {
    var result = await gasGet(url, { type: "calendar", date: dateStr });
    if (result.events) {
      calendarEvents = result.events;
    } else if (result.success && result.data && result.data.events) {
      calendarEvents = result.data.events;
    } else {
      calendarEvents = [];
    }
  } catch (e) {
    calendarEvents = [];
    showToast("カレンダー取得失敗", "error");
  } finally {
    loading = false;
    renderDaily(container);
  }
}

// --- Navigation ---

function navigateDate(offset) {
  var parts = currentDateStr.split("-");
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + offset);
  currentDateStr = formatDate(d);
  loadCalendarEvents(currentDateStr);
}

// --- Utility ---

function formatDateJP(dateStr) {
  var parts = dateStr.split("-");
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  var weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return (
    d.getMonth() + 1 + "月" + d.getDate() + "日(" + weekdays[d.getDay()] + ")"
  );
}

function escapeHtml(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
