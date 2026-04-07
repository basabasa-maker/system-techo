import { useState, useMemo, useEffect, useCallback } from "react";
import { generateTimeSlots, slotToNumber } from "../utils/dateUtils";

const TIME_SLOTS = generateTimeSlots();

const PRIORITY_COLORS = {
  高: "bg-[#e8b8b8] text-[#2c2c2c]",
  中: "bg-[#e8c88f] text-[#2c2c2c]",
  低: "bg-[#7fb88f] text-white",
};

const TYPE_COLORS = {
  plan: "#d4e8b8",
  auto: "#b8d4e8",
};

export default function DailyTab({
  dateStr,
  calendarEvents,
  tasks,
  onTasksUpdate,
  loadCalendar,
}) {
  const [refreshing, setRefreshing] = useState(false);

  // Load calendar events when dateStr changes
  useEffect(() => {
    if (loadCalendar && dateStr) {
      loadCalendar(dateStr);
    }
  }, [dateStr, loadCalendar]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    if (!loadCalendar || !dateStr || refreshing) return;
    setRefreshing(true);
    await loadCalendar(dateStr);
    setRefreshing(false);
  }, [loadCalendar, dateStr, refreshing]);

  // Convert calendar events to block-like objects for timeline display
  const calendarBlocks = useMemo(() => {
    if (!calendarEvents || calendarEvents.length === 0) return [];
    return calendarEvents
      .map((ev) => {
        let startHour, startMin, endHour, endMin;

        if (ev.hour != null && !isNaN(Number(ev.hour))) {
          const h = Number(ev.hour);
          const eh =
            ev.endHour != null && !isNaN(Number(ev.endHour))
              ? Number(ev.endHour)
              : h + 1;
          startHour = Math.floor(h);
          startMin = h % 1 >= 0.5 ? 30 : 0;
          endHour = Math.floor(eh);
          endMin = eh % 1 >= 0.5 ? 30 : 0;
        } else if (ev.start) {
          const startDate = new Date(ev.start);
          const endDate = ev.end ? new Date(ev.end) : null;
          if (!endDate) return null;
          startHour = startDate.getHours();
          startMin = startDate.getMinutes() >= 30 ? 30 : 0;
          endHour = endDate.getHours();
          endMin = endDate.getMinutes() >= 30 ? 30 : 0;
        } else {
          return null;
        }

        // Handle times before 4AM as next-day (24+)
        if (startHour < 4) startHour += 24;
        if (endHour < 4) endHour += 24;
        // If end equals start, bump to at least 30min
        if (startHour === endHour && startMin === endMin) {
          endMin += 30;
          if (endMin >= 60) {
            endHour += 1;
            endMin = 0;
          }
        }

        return {
          id: `cal-${ev.id || ev.summary || ev.text}`,
          startHour,
          startMin,
          endHour,
          endMin,
          description: ev.text || ev.summary || ev.title || "(予定)",
          type: ev.type || "plan",
          calendarName: ev.calendarName || "",
        };
      })
      .filter(Boolean);
  }, [calendarEvents]);

  // All-day events (hour === -1 or missing time info)
  const allDayEvents = useMemo(() => {
    if (!calendarEvents || calendarEvents.length === 0) return [];
    return calendarEvents.filter(
      (ev) =>
        ev.allDay ||
        (ev.hour != null && Number(ev.hour) === -1) ||
        (ev.hour == null && !ev.start),
    );
  }, [calendarEvents]);

  // Today's tasks
  const todayTasks = useMemo(() => {
    if (!tasks) return [];
    const activeStatuses = ["active", "進行中", "未着手", ""];
    return tasks.filter(
      (t) => t.due === dateStr && activeStatuses.includes(t.status),
    );
  }, [tasks, dateStr]);

  // Build slot -> block lookup
  const slotBlockMap = useMemo(() => {
    const map = new Map();
    TIME_SLOTS.forEach((slot) => {
      const slotNum = slotToNumber(slot.hour, slot.minute);
      const slotEnd = slotNum + 0.5;
      const overlapping = calendarBlocks.filter((b) => {
        const bStart = slotToNumber(b.startHour, b.startMin);
        const bEnd = slotToNumber(b.endHour, b.endMin);
        return bStart < slotEnd && bEnd > slotNum;
      });
      const key = `${slot.hour}-${slot.minute}`;
      map.set(key, overlapping);
    });
    return map;
  }, [calendarBlocks]);

  const handleTaskComplete = (task) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const completedDate = `${y}-${m}-${d}`;

    const updatedTasks = tasks.map((t) =>
      t.id === task.id
        ? { ...t, status: "completed", progress: 100, completedDate }
        : t,
    );
    onTasksUpdate(updatedTasks);
  };

  return (
    <div className="pb-24">
      {/* Refresh bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: "#e0ddd5" }}
      >
        <span className="text-xs" style={{ color: "#6b6b6b" }}>
          Google Calendar
        </span>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs px-3 py-1 rounded-full border"
          style={{
            borderColor: "#1e3a5f",
            color: refreshing ? "#6b6b6b" : "#1e3a5f",
            backgroundColor: "transparent",
          }}
        >
          {refreshing ? "更新中..." : "更新"}
        </button>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b" style={{ borderColor: "#e0ddd5" }}>
          <div
            className="text-xs font-medium mb-1"
            style={{ color: "#6b6b6b" }}
          >
            終日
          </div>
          {allDayEvents.map((ev, i) => (
            <div
              key={`allday-${i}`}
              className="text-xs px-2 py-1 rounded mb-1"
              style={{ backgroundColor: "#d4e8b8", color: "#2c2c2c" }}
            >
              {ev.text || ev.summary || ev.title || "(終日の予定)"}
            </div>
          ))}
        </div>
      )}

      {/* No events message */}
      {calendarBlocks.length === 0 && allDayEvents.length === 0 && (
        <div className="text-center py-8">
          <span className="text-sm" style={{ color: "#6b6b6b" }}>
            この日の予定はありません
          </span>
        </div>
      )}

      {/* Time Grid - read-only calendar view */}
      <div>
        {TIME_SLOTS.map((slot) => {
          const key = `${slot.hour}-${slot.minute}`;
          const overlapping = slotBlockMap.get(key) || [];
          const topBlock = overlapping[0] || null;

          let showText = false;
          if (topBlock) {
            const bStart = slotToNumber(topBlock.startHour, topBlock.startMin);
            const slotNum = slotToNumber(slot.hour, slot.minute);
            showText = Math.abs(bStart - slotNum) < 0.01;
          }

          const bgColor = topBlock
            ? TYPE_COLORS[topBlock.type] || "#d4e8b8"
            : "transparent";

          return (
            <div
              key={key}
              className="flex items-stretch border-b"
              style={{
                borderColor: "#e0ddd5",
                minHeight: "36px",
              }}
            >
              {/* Time label */}
              <div
                className="flex-shrink-0 flex items-center justify-end pr-2 text-xs"
                style={{
                  width: "52px",
                  color: "#6b6b6b",
                  borderRight: "1px solid #e0ddd5",
                }}
              >
                {slot.label}
              </div>
              {/* Block area */}
              <div
                className="flex-1 flex items-center px-2 min-h-[36px]"
                style={{
                  backgroundColor: bgColor,
                  borderTop:
                    showText && topBlock
                      ? "1.5px solid rgba(255,255,255,0.8)"
                      : "none",
                }}
              >
                {showText && topBlock && (
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: "#2c2c2c" }}
                  >
                    {topBlock.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task section */}
      <div className="mt-4 px-4">
        <h3 className="text-sm font-bold mb-2" style={{ color: "#1e3a5f" }}>
          今日のタスク
        </h3>
        {todayTasks.length === 0 ? (
          <div className="text-xs text-[#6b6b6b] py-2">
            今日が期限のタスクはありません
          </div>
        ) : (
          todayTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 py-2 border-b"
              style={{ borderColor: "#e0ddd5" }}
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => handleTaskComplete(task)}
                className="w-4 h-4"
              />
              <span className="text-sm flex-1" style={{ color: "#2c2c2c" }}>
                {task.title}
              </span>
              {task.priority && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] || ""}`}
                >
                  {task.priority}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
