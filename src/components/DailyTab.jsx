import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { generateTimeSlots, slotToNumber } from '../utils/dateUtils';
import ConfirmDialog from './ConfirmDialog';

const TIME_SLOTS = generateTimeSlots();

// --- Data format conversion ---
// GAS format: { id, date, hour, endHour, type, text, created }
//   hour/endHour are like "9:00", "13:30"
// UI format:  { startHour, startMin, endHour, endMin, description, type }

function gasToUi(entry) {
  const parseHour = (h) => {
    if (h == null || h === '') return { hour: 0, min: 0 };
    const s = String(h);
    const parts = s.split(':');
    return {
      hour: parseInt(parts[0], 10) || 0,
      min: parseInt(parts[1], 10) || 0,
    };
  };
  const start = parseHour(entry.hour);
  const end = parseHour(entry.endHour);
  return {
    id: entry.id,
    startHour: start.hour,
    startMin: start.min,
    endHour: end.hour,
    endMin: end.min,
    description: entry.text || '',
    type: entry.type || 'manual',
    source: entry.source || undefined,
    calendarName: entry.calendarName || undefined,
  };
}

function uiToGas(block, dateStr) {
  const fmtTime = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
  return {
    id: block.id || String(Date.now()),
    date: dateStr,
    hour: fmtTime(block.startHour, block.startMin),
    endHour: fmtTime(block.endHour, block.endMin),
    type: block.type || 'manual',
    text: block.description || '',
    created: block.created || new Date().toISOString(),
  };
}

// --- isCompleted helper for tasks ---
function isCompleted(task) {
  const s = String(task.status || '').toLowerCase();
  return s === 'completed' || s === '\u5B8C\u4E86';
}

// --- BlockModal: add and edit ---
function BlockModal({ isOpen, onClose, onSave, initialSlot, editingBlock }) {
  const [startHour, setStartHour] = useState(9);
  const [startMin, setStartMin] = useState(0);
  const [endHour, setEndHour] = useState(10);
  const [endMin, setEndMin] = useState(0);
  const [description, setDescription] = useState('');
  const [blockType, setBlockType] = useState('manual');

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
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
      const nextH = initialSlot.minute === 30 ? initialSlot.hour + 1 : initialSlot.hour;
      const nextM = initialSlot.minute === 30 ? 0 : 30;
      setEndHour(nextH);
      setEndMin(nextM);
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
  }, [isOpen, editingBlock, initialSlot]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!description.trim()) return;
    onSave({
      id: editingBlock?.id || undefined,
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

  const isEdit = !!editingBlock;

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
          {isEdit ? '\u4E88\u5B9A\u3092\u7DE8\u96C6' : '\u4E88\u5B9A\u3092\u8FFD\u52A0'}
        </h3>

        {/* Time selectors */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm" style={{ color: '#6b6b6b' }}>
            \u958B\u59CB
          </label>
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

          <label className="text-sm" style={{ color: '#6b6b6b' }}>
            \u7D42\u4E86
          </label>
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
          placeholder="\u4E88\u5B9A\u306E\u5185\u5BB9"
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
            \u7FFC (Auto)
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
            \u30D0\u30B5\u30D0\u30B5 (Manual)
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded text-sm border"
            style={{ borderColor: '#e0ddd5', color: '#6b6b6b' }}
          >
            \u30AD\u30E3\u30F3\u30BB\u30EB
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded text-sm font-bold text-white"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            \u4FDD\u5B58
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main DailyTab component ---
export default function DailyTab({
  dateStr,
  entries = [],
  calendarEvents = [],
  onUpdate,
  tasks = [],
  onTasksUpdate,
  loadCalendar,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // Long press tracking
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  // Load calendar events when dateStr changes
  useEffect(() => {
    if (loadCalendar) {
      loadCalendar(dateStr);
    }
  }, [dateStr, loadCalendar]);

  // Convert GAS entries to UI blocks
  const uiBlocks = useMemo(() => {
    return entries.map(gasToUi);
  }, [entries]);

  // Convert calendar events to UI blocks with type='plan'
  const calendarBlocks = useMemo(() => {
    return calendarEvents.map((ev) => ({
      ...gasToUi(ev),
      type: 'plan',
    }));
  }, [calendarEvents]);

  // Merge: all blocks for display
  const allBlocks = useMemo(() => {
    return [...uiBlocks, ...calendarBlocks];
  }, [uiBlocks, calendarBlocks]);

  // Build slot-to-block lookup: manual > auto > plan priority
  const slotBlockMap = useMemo(() => {
    const typePriority = { manual: 0, auto: 1, plan: 2 };
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
          return (typePriority[a.type] ?? 9) - (typePriority[b.type] ?? 9);
        });
      const key = `${slot.hour}-${slot.minute}`;
      map.set(key, overlapping);
    });
    return map;
  }, [allBlocks]);

  const getBlockColor = (type) => {
    switch (type) {
      case 'manual':
        return '#e8b8b8';
      case 'auto':
        return '#b8d4e8';
      case 'plan':
        return '#c8e8c8';
      default:
        return 'transparent';
    }
  };

  // Tap handler: if block exists open edit, otherwise open add
  const handleSlotTap = useCallback(
    (slot, topBlock) => {
      if (longPressTriggered.current) return;
      if (topBlock && topBlock.type !== 'plan') {
        // Edit existing block
        setEditingBlock(topBlock);
        setSelectedSlot(null);
        setModalOpen(true);
      } else {
        // Add new block
        setEditingBlock(null);
        setSelectedSlot(slot);
        setModalOpen(true);
      }
    },
    []
  );

  // Long press handlers
  const handleTouchStart = useCallback(
    (block) => {
      if (!block || block.type === 'plan') return;
      longPressTriggered.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        setConfirmDialog({
          open: true,
          title: '\u4E88\u5B9A\u3092\u524A\u9664',
          message: `\u300C${block.description}\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F`,
          onConfirm: () => {
            const updated = entries.filter((e) => e.id !== block.id);
            if (onUpdate) onUpdate(updated);
            setConfirmDialog((d) => ({ ...d, open: false }));
          },
        });
      }, 600);
    },
    [entries, onUpdate]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Save block (add or edit)
  const handleSaveBlock = useCallback(
    (blockData) => {
      if (!onUpdate) return;
      if (blockData.id) {
        // Edit: update existing entry
        const updated = entries.map((e) =>
          e.id === blockData.id ? uiToGas(blockData, dateStr) : e
        );
        onUpdate(updated);
      } else {
        // Add: append new entry
        const newEntry = uiToGas(blockData, dateStr);
        onUpdate([...entries, newEntry]);
      }
    },
    [entries, onUpdate, dateStr]
  );

  const handleFabTap = () => {
    setEditingBlock(null);
    setSelectedSlot(null);
    setModalOpen(true);
  };

  // Tasks due today
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.due) return false;
      // Handle ISO dates with T (e.g. "2026-04-04T00:00:00")
      const dueDate = String(t.due).split('T')[0];
      return dueDate === dateStr;
    });
  }, [tasks, dateStr]);

  const handleTaskComplete = useCallback(
    (task) => {
      setConfirmDialog({
        open: true,
        title: '\u30BF\u30B9\u30AF\u5B8C\u4E86',
        message: `\u300C${task.title}\u300D\u3092\u5B8C\u4E86\u3057\u307E\u3059\u304B\uFF1F`,
        onConfirm: () => {
          if (onTasksUpdate) {
            const updated = tasks.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: 'completed',
                    progress: 100,
                    completedDate: new Date().toISOString(),
                  }
                : t
            );
            onTasksUpdate(updated);
          }
          setConfirmDialog((d) => ({ ...d, open: false }));
        },
      });
    },
    [tasks, onTasksUpdate]
  );

  return (
    <div className="pb-24">
      {/* Time Grid */}
      <div>
        {TIME_SLOTS.map((slot) => {
          const key = `${slot.hour}-${slot.minute}`;
          const overlapping = slotBlockMap.get(key) || [];
          const topBlock = overlapping[0] || null;

          // Determine if this is the first slot of the block (show text only on first)
          let showText = false;
          if (topBlock) {
            const bStart = slotToNumber(topBlock.startHour, topBlock.startMin);
            const slotNum = slotToNumber(slot.hour, slot.minute);
            showText = Math.abs(bStart - slotNum) < 0.01;
          }

          const bgColor = topBlock ? getBlockColor(topBlock.type) : 'transparent';

          return (
            <div
              key={key}
              className="flex items-stretch border-b"
              style={{
                borderColor: '#e0ddd5',
                minHeight: '36px',
              }}
              onClick={() => handleSlotTap(slot, topBlock)}
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
                style={{ backgroundColor: bgColor }}
              >
                {showText && topBlock && (
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: '#2c2c2c' }}
                  >
                    {topBlock.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Tasks section */}
      <div className="mt-4 px-4">
        <h3
          className="text-sm font-bold mb-2"
          style={{ color: '#1e3a5f' }}
        >
          \u4ECA\u65E5\u306E\u30BF\u30B9\u30AF
        </h3>
        {todayTasks.length === 0 ? (
          <p className="text-xs" style={{ color: '#6b6b6b' }}>
            \u4ECA\u65E5\u306E\u30BF\u30B9\u30AF\u306F\u3042\u308A\u307E\u305B\u3093
          </p>
        ) : (
          todayTasks.map((task) => {
            const done = isCompleted(task);
            return (
              <div
                key={task.id}
                className="flex items-center gap-2 py-2 border-b"
                style={{ borderColor: '#e0ddd5' }}
              >
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => {
                    if (!done) handleTaskComplete(task);
                  }}
                  disabled={done}
                  className="w-4 h-4"
                />
                <span
                  className="text-sm"
                  style={{
                    color: done ? '#6b6b6b' : '#2c2c2c',
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>
              </div>
            );
          })
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

      {/* Block Modal (add / edit) */}
      <BlockModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBlock(null);
          setSelectedSlot(null);
        }}
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
