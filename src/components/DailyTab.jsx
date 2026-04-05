import { useState, useMemo, useEffect } from 'react';
import { generateTimeSlots, slotToNumber } from '../utils/dateUtils';
import ConfirmDialog from './ConfirmDialog';

const TIME_SLOTS = generateTimeSlots();

const PRIORITY_COLORS = {
  '高': 'bg-[#e8b8b8] text-[#2c2c2c]',
  '中': 'bg-[#e8c88f] text-[#2c2c2c]',
  '低': 'bg-[#7fb88f] text-white',
};

// GAS format {id, date, hour, endHour, type, text} → UI format {startHour, startMin, endHour, endMin, description, type}
function gasToUi(entry) {
  const h = Number(entry.hour);
  const eh = entry.endHour !== '' && entry.endHour != null ? Number(entry.endHour) : h + 1;
  return {
    ...entry,
    startHour: Math.floor(h),
    startMin: (h % 1) >= 0.5 ? 30 : 0,
    endHour: Math.floor(eh),
    endMin: (eh % 1) >= 0.5 ? 30 : 0,
    description: entry.text || entry.description || '',
  };
}

// UI format → GAS format for saving
function uiToGas(block) {
  return {
    id: block.id,
    date: block.date,
    hour: block.startHour + (block.startMin === 30 ? 0.5 : 0),
    endHour: block.endHour + (block.endMin === 30 ? 0.5 : 0),
    type: block.type || 'manual',
    text: block.description || '',
  };
}

function BlockModal({ isOpen, onClose, onSave, initialSlot, editingBlock }) {
  const [startHour, setStartHour] = useState(9);
  const [startMin, setStartMin] = useState(0);
  const [endHour, setEndHour] = useState(10);
  const [endMin, setEndMin] = useState(0);
  const [description, setDescription] = useState('');
  const [blockType, setBlockType] = useState('manual');

  useEffect(() => {
    if (isOpen) {
      if (editingBlock) {
        setStartHour(editingBlock.startHour);
        setStartMin(editingBlock.startMin);
        setEndHour(editingBlock.endHour);
        setEndMin(editingBlock.endMin);
        setDescription(editingBlock.description || '');
        setBlockType(editingBlock.type || 'manual');
      } else if (initialSlot) {
        setStartHour(initialSlot.hour);
        setStartMin(initialSlot.minute);
        setEndHour(initialSlot.hour + 1);
        setEndMin(initialSlot.minute);
        setDescription('');
        setBlockType('manual');
      } else {
        setStartHour(9);
        setStartMin(0);
        setEndHour(10);
        setEndMin(0);
        setDescription('');
        setBlockType('manual');
      }
    }
  }, [isOpen, editingBlock, initialSlot]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!description.trim()) return;
    onSave({
      ...(editingBlock || {}),
      startHour,
      startMin,
      endHour,
      endMin,
      description: description.trim(),
      type: blockType,
    });
    onClose();
  };

  const hourOptions = [];
  for (let h = 4; h <= 27; h++) {
    const displayH = h >= 24 ? h - 24 : h;
    hourOptions.push(
      <option key={h} value={h}>
        {displayH}
      </option>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl p-5"
        style={{ backgroundColor: '#f5f5f0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-base font-bold mb-4"
          style={{ color: '#1e3a5f' }}
        >
          {editingBlock ? '予定を編集' : '予定を追加'}
        </h3>

        {/* Time selectors */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm" style={{ color: '#6b6b6b' }}>開始</label>
          <select
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
            style={{ borderColor: '#e0ddd5' }}
          >
            {hourOptions}
          </select>
          <span>:</span>
          <select
            value={startMin}
            onChange={(e) => setStartMin(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
            style={{ borderColor: '#e0ddd5' }}
          >
            <option value={0}>00</option>
            <option value={30}>30</option>
          </select>

          <span className="mx-2">~</span>

          <label className="text-sm" style={{ color: '#6b6b6b' }}>終了</label>
          <select
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
            style={{ borderColor: '#e0ddd5' }}
          >
            {hourOptions}
          </select>
          <span>:</span>
          <select
            value={endMin}
            onChange={(e) => setEndMin(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
            style={{ borderColor: '#e0ddd5' }}
          >
            <option value={0}>00</option>
            <option value={30}>30</option>
          </select>
        </div>

        {/* Description */}
        <input
          type="text"
          placeholder="予定の内容"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm mb-3"
          style={{ borderColor: '#e0ddd5', backgroundColor: 'white' }}
          autoFocus
        />

        {/* Type selector */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setBlockType('auto')}
            className="flex-1 py-2 rounded text-sm font-medium border"
            style={{
              backgroundColor: blockType === 'auto' ? '#b8d4e8' : 'white',
              borderColor: '#b8d4e8',
              color: '#2c2c2c',
            }}
          >
            翼 (Auto)
          </button>
          <button
            onClick={() => setBlockType('manual')}
            className="flex-1 py-2 rounded text-sm font-medium border"
            style={{
              backgroundColor: blockType === 'manual' ? '#e8b8b8' : 'white',
              borderColor: '#e8b8b8',
              color: '#2c2c2c',
            }}
          >
            バサバサ (Manual)
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded text-sm border"
            style={{ borderColor: '#e0ddd5', color: '#6b6b6b' }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded text-sm font-bold text-white"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DailyTab({ dateStr, entries, calendarEvents, onUpdate, tasks, onTasksUpdate, loadCalendar }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  // Load calendar events when dateStr changes
  useEffect(() => {
    if (loadCalendar && dateStr) {
      loadCalendar(dateStr);
    }
  }, [dateStr, loadCalendar]);

  // Filter blocks for the current date, converting GAS format to UI format
  // Skip entries with no text/description or null/invalid hours
  const blocks = useMemo(() => {
    return (entries || [])
      .filter((b) => b.date === dateStr)
      .filter((b) => {
        const hasText = (b.text && b.text.trim()) || (b.description && b.description.trim());
        const hasValidHour = b.hour != null && !isNaN(Number(b.hour));
        return hasText && hasValidHour;
      })
      .map(gasToUi);
  }, [entries, dateStr]);

  // Convert calendar events to block-like objects (type: 'plan')
  // GAS returns {id, hour, endHour, text, type} format
  const calendarBlocks = useMemo(() => {
    if (!calendarEvents || calendarEvents.length === 0) return [];
    return calendarEvents.map((ev) => {
      let startHour, startMin, endHour, endMin;

      if (ev.hour != null && !isNaN(Number(ev.hour))) {
        // GAS format: {hour, endHour}
        const h = Number(ev.hour);
        const eh = ev.endHour != null && !isNaN(Number(ev.endHour)) ? Number(ev.endHour) : h + 1;
        startHour = Math.floor(h);
        startMin = (h % 1) >= 0.5 ? 30 : 0;
        endHour = Math.floor(eh);
        endMin = (eh % 1) >= 0.5 ? 30 : 0;
      } else if (ev.start) {
        // ISO format fallback: {start, end}
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
        if (endMin >= 60) { endHour += 1; endMin = 0; }
      }

      return {
        id: `cal-${ev.id || ev.summary || ev.text}`,
        startHour,
        startMin,
        endHour,
        endMin,
        description: ev.text || ev.summary || ev.title || '(予定)',
        type: 'plan',
        calendarEvent: true,
      };
    }).filter(Boolean);
  }, [calendarEvents]);

  // Merge manual entries with calendar blocks. Manual overrides auto/plan at same slot.
  const allBlocks = useMemo(() => {
    return [...blocks, ...calendarBlocks];
  }, [blocks, calendarBlocks]);

  // Today's tasks: filter tasks with due === dateStr and active status
  // Status compatibility: "進行中", "未着手", "", "active" are all treated as active
  const todayTasks = useMemo(() => {
    if (!tasks) return [];
    const activeStatuses = ['active', '進行中', '未着手', ''];
    return tasks.filter((t) => t.due === dateStr && activeStatuses.includes(t.status));
  }, [tasks, dateStr]);

  const handleSlotTap = (slot) => {
    // Check if there's a manual block on this slot to edit
    const slotNum = slotToNumber(slot.hour, slot.minute);
    const slotEnd = slotNum + 0.5;
    const existing = blocks.find((b) => {
      const bStart = slotToNumber(b.startHour, b.startMin);
      const bEnd = slotToNumber(b.endHour, b.endMin);
      return bStart < slotEnd && bEnd > slotNum && !b.calendarEvent;
    });

    if (existing) {
      // Edit existing block
      setEditingBlock(existing);
      setSelectedSlot(null);
      setModalOpen(true);
    } else {
      // Add new block
      setEditingBlock(null);
      setSelectedSlot(slot);
      setModalOpen(true);
    }
  };

  const handleSaveBlock = (blockData) => {
    const allEntries = entries || [];
    const gasEntry = uiToGas({ ...blockData, date: blockData.date || dateStr });

    if (blockData.id && !blockData.calendarEvent) {
      // Edit existing
      const updated = allEntries.map((b) =>
        b.id === blockData.id ? { ...b, ...gasEntry } : b
      );
      onUpdate(updated);
    } else {
      // Add new
      const newEntry = {
        ...gasEntry,
        id: Date.now(),
        date: dateStr,
      };
      onUpdate([...allEntries, newEntry]);
    }
  };

  const handleDeleteBlock = (block) => {
    if (block.calendarEvent) return; // Can't delete calendar events
    setConfirmDialog({
      open: true,
      title: '予定を削除',
      message: `「${block.description}」を削除しますか？`,
      onConfirm: () => {
        const updated = (entries || []).filter((b) => b.id !== block.id);
        onUpdate(updated);
        setConfirmDialog((d) => ({ ...d, open: false }));
      },
    });
  };

  const handleLongPress = (block) => {
    if (block.calendarEvent) return;
    handleDeleteBlock(block);
  };

  const handleFabTap = () => {
    setSelectedSlot(null);
    setEditingBlock(null);
    setModalOpen(true);
  };

  const handleTaskComplete = (task) => {
    setConfirmDialog({
      open: true,
      title: 'タスク完了',
      message: `「${task.title}」を完了しますか？`,
      onConfirm: () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const completedDate = `${y}-${m}-${d}`;

        const updatedTasks = tasks.map((t) =>
          t.id === task.id
            ? { ...t, status: 'completed', progress: 100, completedDate }
            : t
        );
        onTasksUpdate(updatedTasks);
        setConfirmDialog((d) => ({ ...d, open: false }));
      },
    });
  };

  // Build slot -> block lookup. Manual > plan > auto priority.
  const slotBlockMap = useMemo(() => {
    const map = new Map();
    TIME_SLOTS.forEach((slot) => {
      const slotNum = slotToNumber(slot.hour, slot.minute);
      const slotEnd = slotNum + 0.5;
      const overlapping = allBlocks
        .filter((b) => {
          const bStart = slotToNumber(b.startHour, b.startMin);
          const bEnd = slotToNumber(b.endHour, b.endMin);
          return bStart < slotEnd && bEnd > slotNum;
        })
        .sort((a, b) => {
          // manual wins over plan/auto
          const typePriority = { manual: 0, plan: 1, auto: 2 };
          return (typePriority[a.type] ?? 1) - (typePriority[b.type] ?? 1);
        });
      const key = `${slot.hour}-${slot.minute}`;
      map.set(key, overlapping);
    });
    return map;
  }, [allBlocks]);

  // Long press handling
  const longPressTimer = useMemo(() => ({ current: null }), []);

  const handleTouchStart = (block) => {
    if (!block || block.calendarEvent) return;
    longPressTimer.current = setTimeout(() => {
      handleLongPress(block);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="pb-24">
      {/* Time Grid */}
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
            ? topBlock.type === 'plan'
              ? '#d4e8b8'
              : topBlock.type === 'auto'
                ? '#b8d4e8'
                : '#e8b8b8'
            : 'transparent';

          return (
            <div
              key={key}
              className="flex items-stretch border-b"
              style={{
                borderColor: '#e0ddd5',
                minHeight: '36px',
              }}
              onClick={() => handleSlotTap(slot)}
              onTouchStart={() => handleTouchStart(topBlock)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              {/* Time label */}
              <div
                className="flex-shrink-0 flex items-center justify-end pr-2 text-xs"
                style={{
                  width: '52px',
                  color: '#6b6b6b',
                  borderRight: '1px solid #e0ddd5',
                }}
              >
                {slot.label}
              </div>
              {/* Block area */}
              <div
                className="flex-1 flex items-center px-2 min-h-[36px]"
                style={{
                  backgroundColor: bgColor,
                  borderTop: showText && topBlock ? '1.5px solid rgba(255,255,255,0.8)' : 'none',
                }}
              >
                {showText && topBlock && (
                  <span className="text-xs font-medium truncate" style={{ color: '#2c2c2c' }}>
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
        <h3
          className="text-sm font-bold mb-2"
          style={{ color: '#1e3a5f' }}
        >
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
              style={{ borderColor: '#e0ddd5' }}
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => handleTaskComplete(task)}
                className="w-4 h-4"
              />
              <span className="text-sm flex-1" style={{ color: '#2c2c2c' }}>
                {task.title}
              </span>
              {task.priority && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] || ''}`}
                >
                  {task.priority}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleFabTap}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg active:opacity-80 z-40"
        style={{ backgroundColor: '#1e3a5f' }}
        aria-label="Add entry"
      >
        +
      </button>

      {/* Block Modal */}
      <BlockModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBlock(null); }}
        onSave={handleSaveBlock}
        initialSlot={selectedSlot}
        editingBlock={editingBlock}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
      />
    </div>
  );
}
