import { useState, useMemo } from 'react';
import { generateTimeSlots, slotToNumber, localDateStr } from '../utils/dateUtils';

const TIME_SLOTS = generateTimeSlots();

function BlockModal({ isOpen, onClose, onSave, initialSlot }) {
  const [startHour, setStartHour] = useState(initialSlot?.hour ?? 9);
  const [startMin, setStartMin] = useState(initialSlot?.minute ?? 0);
  const [endHour, setEndHour] = useState(initialSlot ? initialSlot.hour + 1 : 10);
  const [endMin, setEndMin] = useState(initialSlot?.minute ?? 0);
  const [description, setDescription] = useState('');
  const [blockType, setBlockType] = useState('manual');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!description.trim()) return;
    onSave({
      startHour,
      startMin,
      endHour,
      endMin,
      description: description.trim(),
      type: blockType,
    });
    setDescription('');
    onClose();
  };

  // Generate hour options for start (4-27) and end (4-27, with 28 for 4:00 end)
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
          予定を追加
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

export default function DailyTab({ dateStr }) {
  const [blocks, setBlocks] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [tasks, setTasks] = useState([
    { id: 1, text: '(タスクタブと連携予定)', done: false },
  ]);

  const handleSlotTap = (slot) => {
    setSelectedSlot(slot);
    setModalOpen(true);
  };

  const handleAddBlock = (blockData) => {
    setBlocks((prev) => [
      ...prev,
      { ...blockData, id: Date.now(), date: dateStr },
    ]);
  };

  const handleFabTap = () => {
    setSelectedSlot(null);
    setModalOpen(true);
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // Build a lookup: for each slot, find which blocks overlap it
  const slotBlockMap = useMemo(() => {
    const map = new Map();
    TIME_SLOTS.forEach((slot) => {
      const slotNum = slotToNumber(slot.hour, slot.minute);
      const slotEnd = slotNum + 0.5;
      // Find blocks that overlap this slot. Manual blocks take priority.
      const overlapping = blocks
        .filter((b) => {
          const bStart = slotToNumber(b.startHour, b.startMin);
          const bEnd = slotToNumber(b.endHour, b.endMin);
          return bStart < slotEnd && bEnd > slotNum;
        })
        .sort((a, b) => {
          // manual wins over auto
          if (a.type === 'manual' && b.type !== 'manual') return -1;
          if (b.type === 'manual' && a.type !== 'manual') return 1;
          return 0;
        });
      const key = `${slot.hour}-${slot.minute}`;
      map.set(key, overlapping);
    });
    return map;
  }, [blocks]);

  return (
    <div className="pb-24">
      {/* Time Grid */}
      <div>
        {TIME_SLOTS.map((slot) => {
          const key = `${slot.hour}-${slot.minute}`;
          const overlapping = slotBlockMap.get(key) || [];
          const topBlock = overlapping[0] || null;

          // Determine if this is the first slot of the block (show text)
          let showText = false;
          if (topBlock) {
            const bStart = slotToNumber(topBlock.startHour, topBlock.startMin);
            const slotNum = slotToNumber(slot.hour, slot.minute);
            showText = Math.abs(bStart - slotNum) < 0.01;
          }

          const bgColor = topBlock
            ? topBlock.type === 'auto'
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
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 py-2 border-b"
            style={{ borderColor: '#e0ddd5' }}
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
              className="w-4 h-4"
            />
            <span
              className="text-sm"
              style={{
                color: task.done ? '#6b6b6b' : '#2c2c2c',
                textDecoration: task.done ? 'line-through' : 'none',
              }}
            >
              {task.text}
            </span>
          </div>
        ))}
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

      {/* Add Modal */}
      <BlockModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddBlock}
        initialSlot={selectedSlot}
      />
    </div>
  );
}
