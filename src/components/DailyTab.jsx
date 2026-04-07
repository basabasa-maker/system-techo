import { useState, useMemo, useEffect, useCallback } from "react";
import { generateTimeSlots, slotToNumber } from "../utils/dateUtils";

const TIME_SLOTS = generateTimeSlots();

const CALENDAR_COLORS = {
  プライベート: "#4285f4",
  取材: "#e67c73",
  "取材(調整中)": "#f6bf26",
  定期予定: "#33b679",
  "定期予定(仕事)": "#039be5",
  "不定期予定(仕事)": "#7986cb",
};

const DEFAULT_COLOR = "#4285f4";

function getEventColor(calendarName) {
  return CALENDAR_COLORS[calendarName] || DEFAULT_COLOR;
}

export default function DailyTab({
  dateStr,
  calendarEvents,
  tasks,
  onTasksUpdate,
  loadCalendar,
}) {
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleReload = useCallback(() => {
    if (loadCalendar && dateStr) {
      loadCalendar(dateStr);
      setHasLoaded(true);
    }
  }, [dateStr, loadCalendar]);

  // Auto-load when date changes (only if already loaded once)
  useEffect(() => {
    if (hasLoaded && loadCalendar && dateStr) {
      loadCalendar(dateStr);
    }
  }, [dateStr]);

  // Convert calendar events to display blocks
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

        if (startHour < 4) startHour += 24;
        if (endHour < 4) endHour += 24;
        if (startHour === endHour && startMin === endMin) {
          endMin += 30;
          if (endMin >= 60) {
            endHour += 1;
            endMin = 0;
          }
        }

        return {
          id: ev.id || `cal-${ev.summary || ev.text}`,
          startHour,
          startMin,
          endHour,
          endMin,
          description: ev.text || ev.summary || ev.title || "(予定)",
          calendarName: ev.calendarName || "",
          color: getEventColor(ev.calendarName),
        };
      })
      .filter(Boolean);
  }, [calendarEvents]);

  // Build slot map — supports multiple events per slot
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
      map.set(`${slot.hour}-${slot.minute}`, overlapping);
    });
    return map;
  }, [calendarBlocks]);

  // Today's tasks
  const todayTasks = useMemo(() => {
    if (!tasks) return [];
    const activeStatuses = ["active", "進行中", "未着手", ""];
    return tasks.filter(
      (t) => t.due === dateStr && activeStatuses.includes(t.status),
    );
  }, [tasks, dateStr]);

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

  // Not loaded yet — show prompt
  if (!hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-[#6b6b6b] mb-4">
          カレンダーを読み込んでください
        </p>
        <button
          onClick={handleReload}
          className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm"
        >
          読み込む
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Time Grid */}
      <div>
        {TIME_SLOTS.map((slot) => {
          const key = `${slot.hour}-${slot.minute}`;
          const overlapping = slotBlockMap.get(key) || [];

          return (
            <div
              key={key}
              className="flex items-stretch border-b"
              style={{ borderColor: "#e0ddd5", minHeight: "36px" }}
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

              {/* Event blocks */}
              <div className="flex-1 flex min-h-[36px]">
                {overlapping.length === 0 ? (
                  <div className="flex-1" />
                ) : (
                  overlapping.map((block, idx) => {
                    const bStart = slotToNumber(
                      block.startHour,
                      block.startMin,
                    );
                    const slotNum = slotToNumber(slot.hour, slot.minute);
                    const showText = Math.abs(bStart - slotNum) < 0.01;
                    const width =
                      overlapping.length > 1
                        ? `${100 / overlapping.length}%`
                        : "100%";

                    return (
                      <div
                        key={block.id + "-" + idx}
                        className="flex items-center px-2"
                        style={{
                          width,
                          backgroundColor: block.color + "30",
                          borderLeft: showText
                            ? `3px solid ${block.color}`
                            : `3px solid transparent`,
                        }}
                      >
                        {showText && (
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: "#2c2c2c" }}
                          >
                            {block.description}
                          </span>
                        )}
                      </div>
                    );
                  })
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
            </div>
          ))
        )}
      </div>

      {/* Reload FAB */}
      <button
        onClick={handleReload}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white text-xl shadow-lg active:opacity-80 z-40"
        style={{ backgroundColor: "#1e3a5f" }}
        aria-label="Reload calendar"
      >
        ↻
      </button>
    </div>
  );
}
