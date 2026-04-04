export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * Returns 'YYYY-MM-DD' string using local date methods (NOT toISOString)
 */
export function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns "YYYY年M月D日 X曜日" format
 */
export function formatDisplayDate(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dayName = DAY_NAMES[date.getDay()];
  return `${y}年${m}月${d}日 ${dayName}曜日`;
}

/**
 * Daily boundary is AM 4:00.
 * Hours 0:00-3:30 belong to the previous calendar day's daily page.
 */
export function isDailyBoundary(hour) {
  return hour >= 4;
}

/**
 * Generate time slots from 4:00 to 27:30 (next day 3:30)
 * Each slot is 30 minutes
 */
export function generateTimeSlots() {
  const slots = [];
  // 4:00 to 23:30 = hours 4-23
  for (let h = 4; h <= 23; h++) {
    slots.push({ hour: h, minute: 0, label: `${h}:00` });
    slots.push({ hour: h, minute: 30, label: `${h}:30` });
  }
  // 0:00 to 3:30 next day (displayed as 24:00-27:30)
  for (let h = 0; h <= 3; h++) {
    const displayHour = h + 24;
    slots.push({ hour: displayHour, minute: 0, label: `${h}:00` });
    if (h < 3 || (h === 3 && true)) {
      slots.push({ hour: displayHour, minute: 30, label: `${h}:30` });
    }
  }
  return slots;
}

/**
 * Convert a slot's hour/minute to a comparable number (e.g., 4:30 -> 4.5, 24:00 -> 24.0)
 */
export function slotToNumber(hour, minute) {
  return hour + minute / 60;
}
