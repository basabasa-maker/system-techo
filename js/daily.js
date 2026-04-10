// daily.js - Dailyタブ（タイムライン形式カレンダー + 関連タスク）

import { todayStr, formatDate } from "./date-utils.js";
import { linkify } from "./url-utils.js";
import { getTasks, getDaily, getGasUrl } from "./store.js";
import { gasGet } from "./gas-client.js";

let currentDateStr = null;

const HOUR_START = 6;
const HOUR_END = 23;
const PX_PER_HOUR = 60;

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
}

// 更新ボタン押下時にapp.jsから呼ばれる
export async function refresh() {
  var url = getGasUrl();
  if (!url) return;
  try {
    var result = await gasGet(url, { type: "calendar", date: currentDateStr });
    if (result.success && result.data && result.data.events) {
      var cached = getDaily() || [];
      // 当日分を差し替え
      cached = cached.filter(function (e) {
        return e.date !== currentDateStr;
      });
      cached = cached.concat(result.data.events);
      localStorage.setItem("system-techo-v2-daily", JSON.stringify(cached));
    }
  } catch (e) {
    // pullAllのエラーハンドリングに任せる
  }
}

// --- Main Render ---

function renderDaily(container) {
  container = container || document.getElementById("tab-content");

  var dateLabel = formatDateJP(currentDateStr);
  var isToday = currentDateStr === todayStr();

  // localStorageキャッシュからイベント取得
  var allEvents = getDaily();
  var dayEvents = filterEventsByDate(allEvents, currentDateStr);

  var html = '<div class="daily-container">';

  // Date Navigation
  html += '<div class="daily-nav">';
  html += '<button class="daily-nav-btn" id="daily-prev">&lt;</button>';
  html += '<div class="daily-nav-center">';
  html += '<span class="daily-date-label">' + escapeHtml(dateLabel) + "</span>";
  if (!isToday) {
    html += '<button class="daily-today-btn" id="daily-today">today</button>';
  }
  html += "</div>";
  html += '<button class="daily-nav-btn" id="daily-next">&gt;</button>';
  html += "</div>";

  // データなしの場合
  if (!allEvents || allEvents.length === 0) {
    html += '<div class="daily-empty-msg">';
    html += "更新ボタンを押してカレンダーを取得してください";
    html += "</div>";
  } else {
    // 終日イベント
    var allDay = dayEvents.filter(function (e) {
      return e.isAllDay;
    });
    var timed = dayEvents.filter(function (e) {
      return !e.isAllDay;
    });

    // 終日イベント表示
    if (allDay.length > 0) {
      html += '<div class="daily-allday-section">';
      for (var i = 0; i < allDay.length; i++) {
        html += renderAllDayEvent(allDay[i]);
      }
      html += "</div>";
    }

    // タイムライン
    html += renderTimeline(timed, isToday);
  }

  // 関連タスク
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
      renderDaily(container);
    });
  }
}

// --- Filter events by date ---

function filterEventsByDate(events, dateStr) {
  if (!events || !Array.isArray(events)) return [];
  return events.filter(function (e) {
    return e.date === dateStr;
  });
}

// --- All-day event ---

function renderAllDayEvent(ev) {
  var locationHtml = "";
  if (ev.location) {
    locationHtml =
      '<div class="daily-allday-location">' +
      linkify(String(ev.location)) +
      "</div>";
  }

  var calLabel = "";
  if (ev.calendarName) {
    calLabel =
      '<span class="daily-allday-cal">' +
      escapeHtml(ev.calendarName) +
      "</span>";
  }

  var html = '<div class="daily-allday-event">';
  html += '<div class="daily-allday-badge">all day</div>';
  html += '<div class="daily-allday-body">';
  html +=
    '<div class="daily-allday-title">' +
    escapeHtml(ev.title || "(no title)") +
    "</div>";
  html += locationHtml;
  html += calLabel;
  html += "</div>";
  html += "</div>";
  return html;
}

// --- Timeline ---

function renderTimeline(timedEvents, isToday) {
  var totalHours = HOUR_END - HOUR_START;
  var timelineHeight = totalHours * PX_PER_HOUR;

  var html = '<div class="daily-timeline-wrapper">';
  html +=
    '<div class="daily-timeline" style="height:' + timelineHeight + 'px">';

  // 時間軸ラベル + 横線
  for (var h = HOUR_START; h <= HOUR_END; h++) {
    var top = (h - HOUR_START) * PX_PER_HOUR;
    var label = String(h).padStart(2, "0") + ":00";
    html +=
      '<div class="daily-hour-row" style="top:' +
      top +
      'px">' +
      '<span class="daily-hour-label">' +
      label +
      "</span>" +
      '<div class="daily-hour-line"></div>' +
      "</div>";
  }

  // 現在時刻インジケーター
  if (isToday) {
    var now = new Date();
    var nowH = now.getHours();
    var nowM = now.getMinutes();
    if (nowH >= HOUR_START && nowH < HOUR_END) {
      var nowTop = (nowH - HOUR_START) * PX_PER_HOUR + nowM;
      html += '<div class="daily-now-line" style="top:' + nowTop + 'px"></div>';
    }
  }

  // イベントブロック
  for (var i = 0; i < timedEvents.length; i++) {
    html += renderTimelineEvent(timedEvents[i]);
  }

  html += "</div>"; // .daily-timeline
  html += "</div>"; // .daily-timeline-wrapper
  return html;
}

function renderTimelineEvent(ev) {
  var startMin = parseTimeToMinutes(ev.startTime);
  var endMin = parseTimeToMinutes(ev.endTime);

  // 範囲外の場合はクランプ
  var rangeStartMin = HOUR_START * 60;
  var rangeEndMin = HOUR_END * 60;

  if (startMin === null || startMin < rangeStartMin) startMin = rangeStartMin;
  if (endMin === null || endMin <= startMin) endMin = startMin + 60;
  if (endMin > rangeEndMin) endMin = rangeEndMin;

  var top = ((startMin - rangeStartMin) / 60) * PX_PER_HOUR;
  var height = ((endMin - startMin) / 60) * PX_PER_HOUR;
  if (height < 28) height = 28; // 最小高さ

  var timeLabel = (ev.startTime || "") + (ev.endTime ? " - " + ev.endTime : "");

  var locationHtml = "";
  if (ev.location) {
    locationHtml =
      '<div class="daily-tl-location">' +
      linkify(String(ev.location)) +
      "</div>";
  }

  var calLabel = "";
  if (ev.calendarName) {
    calLabel =
      '<span class="daily-tl-cal">' + escapeHtml(ev.calendarName) + "</span>";
  }

  var html =
    '<div class="daily-tl-event" style="top:' +
    top +
    "px;height:" +
    height +
    'px">';
  html +=
    '<div class="daily-tl-event-title">' +
    escapeHtml(ev.title || "(no title)") +
    "</div>";
  if (timeLabel) {
    html +=
      '<div class="daily-tl-event-time">' + escapeHtml(timeLabel) + "</div>";
  }
  html += locationHtml;
  html += calLabel;
  html += "</div>";
  return html;
}

// --- Today's Tasks ---

function renderTodayTasks() {
  var tasks = getTasks();

  var relevant = tasks.filter(function (t) {
    if (t.status === "completed" || t.deleted === "TRUE") return false;
    if (!t.due) return false;
    return t.due <= currentDateStr;
  });

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

// --- Navigation ---

function navigateDate(offset) {
  var parts = currentDateStr.split("-");
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + offset);
  currentDateStr = formatDate(d);
}

// --- Utility ---

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  var parts = timeStr.split(":");
  if (parts.length < 2) return null;
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

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
