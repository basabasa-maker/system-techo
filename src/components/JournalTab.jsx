import { useState, useMemo, useEffect } from 'react';
import { localDateStr, formatDisplayDate, DAY_NAMES } from '../utils/dateUtils';
import JournalModal from './JournalModal';
import ConfirmDialog from './ConfirmDialog';

function generateCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  // Always pad to 42 cells (6 rows x 7 cols) for consistent height
  while (days.length < 42) {
    days.push(null);
  }

  return days;
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function JournalTab({ journal, onUpdate }) {
  const today = new Date();
  const todayStr = localDateStr(today);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const entries = journal || {};

  // Prevent page scroll when in calendar view (not entry view)
  useEffect(() => {
    if (!selectedDate) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    } else {
      document.body.style.overflow = '';
    }
  }, [selectedDate]);

  const calendarDays = useMemo(
    () => generateCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const makeDateStr = (day) => {
    if (!day) return null;
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  const handleDayTap = (day) => {
    if (!day) return;
    setSelectedDate(makeDateStr(day));
  };

  const selectedEntry = selectedDate ? entries[selectedDate] || null : null;

  const handleSave = (text) => {
    const now = new Date().toISOString();
    const existing = entries[selectedDate];
    const updated = {
      ...entries,
      [selectedDate]: {
        id: existing ? existing.id : Date.now(),
        date: selectedDate,
        text,
        created: existing ? existing.created : now,
        updated: now,
      },
    };
    onUpdate(updated);
    setModalOpen(false);
  };

  const handleDelete = () => {
    const updated = { ...entries };
    delete updated[selectedDate];
    onUpdate(updated);
    setConfirmDeleteOpen(false);
  };

  const goBackToCalendar = () => {
    setSelectedDate(null);
  };

  // ===== Entry View =====
  if (selectedDate) {
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const displayDate = formatDisplayDate(dateObj);

    return (
      <div className="max-w-lg mx-auto flex flex-col min-h-0 overflow-hidden" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {/* Back + Date Header */}
        <div className="mb-4 flex-shrink-0">
          <button
            onClick={goBackToCalendar}
            className="flex items-center gap-1 text-[#1e3a5f] text-sm mb-3 hover:opacity-70 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            カレンダーに戻る
          </button>
          <h2 className="text-lg font-bold text-[#2c2c2c]">{displayDate}</h2>
        </div>

        {selectedEntry ? (
          <div className="bg-white rounded-[10px] border border-[#e0ddd5] shadow-sm p-5 flex-1 min-h-0 overflow-y-auto">
            <p className="text-[#2c2c2c] text-sm leading-relaxed whitespace-pre-wrap">
              {selectedEntry.text}
            </p>
            <div className="mt-4 pt-3 border-t border-[#e0ddd5] flex items-center justify-between">
              <span className="text-xs text-[#6b6b6b]">
                最終更新: {formatTime(selectedEntry.updated || selectedEntry.created)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#e0ddd5] text-[#6b6b6b] text-xs hover:bg-gray-50 transition-colors"
                >
                  ✏️ 編集
                </button>
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#e0ddd5] text-[#6b6b6b] text-xs hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[10px] border border-[#e0ddd5] shadow-sm p-8 text-center">
            <p className="text-[#6b6b6b] text-sm mb-5">
              この日のジャーナルはまだありません
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm hover:bg-[#15304f] transition-colors"
            >
              書く
            </button>
          </div>
        )}

        <JournalModal
          isOpen={modalOpen}
          entry={selectedEntry}
          date={selectedDate}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />

        <ConfirmDialog
          isOpen={confirmDeleteOpen}
          title="ジャーナルを削除"
          message="この日のジャーナルを削除しますか？この操作は取り消せません。"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      </div>
    );
  }

  // ===== Calendar View =====
  return (
    <div className="max-w-lg mx-auto">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-[#e0ddd5] transition-all text-[#2c2c2c]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-[#2c2c2c]">
          {currentYear}年{currentMonth + 1}月
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-[#e0ddd5] transition-all text-[#2c2c2c]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[#6b6b6b]'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-[#e0ddd5] rounded-[10px] overflow-hidden border border-[#e0ddd5]">
        {calendarDays.map((day, idx) => {
          const dateStr = makeDateStr(day);
          const isToday = dateStr === todayStr;
          const hasEntry = dateStr && entries[dateStr];
          const colIndex = idx % 7;
          const isSunday = colIndex === 0;
          const isSaturday = colIndex === 6;

          return (
            <button
              key={idx}
              onClick={() => handleDayTap(day)}
              disabled={!day}
              className={`
                relative bg-white h-14 sm:h-16 flex flex-col items-center justify-center
                transition-colors
                ${day ? 'hover:bg-[#f5f5f0] active:bg-[#eae8e0] cursor-pointer' : 'cursor-default'}
              `}
            >
              {day && (
                <>
                  <span
                    className={`
                      text-sm leading-none
                      ${isToday
                        ? 'bg-[#1e3a5f] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold'
                        : isSunday
                          ? 'text-red-400'
                          : isSaturday
                            ? 'text-blue-400'
                            : 'text-[#2c2c2c]'
                      }
                    `}
                  >
                    {day}
                  </span>
                  {hasEntry && (
                    <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#1e3a5f]" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Entry count hint */}
      <div className="mt-4 flex items-center gap-2 text-xs text-[#6b6b6b]">
        <span className="w-2 h-2 rounded-full bg-[#1e3a5f] inline-block" />
        ジャーナルあり
        <span className="ml-auto">
          {Object.keys(entries).filter((key) => {
            const [y, m] = key.split('-').map(Number);
            return y === currentYear && m === currentMonth + 1;
          }).length}件
        </span>
      </div>
    </div>
  );
}
