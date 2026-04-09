// date-utils.js - JST固定の日付処理（toISOString禁止）

export function todayStr() {
  const now = new Date();
  return formatDate(now);
}

export function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateTime(d) {
  const date = formatDate(d);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${date} ${h}:${min}:${s}`;
}

export function parseDate(str) {
  if (!str) return null;
  return new Date(str + "T12:00:00");
}

export function isOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  const today = todayStr();
  return dueDateStr < today;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
