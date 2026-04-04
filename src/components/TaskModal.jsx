import { useState, useEffect } from 'react';

const PRIORITIES = ['高', '中', '低'];
const PROGRESS_VALUES = [0, 25, 50, 75, 100];

export default function TaskModal({ isOpen, task, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('中');
  const [due, setDue] = useState('');
  const [progress, setProgress] = useState(0);
  const [shopping, setShopping] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title || '');
        setPriority(task.priority || '中');
        setDue(task.due || '');
        setProgress(task.progress ?? 0);
        setShopping(task.shopping || false);
        setNote(task.note || '');
      } else {
        setTitle('');
        setPriority('中');
        setDue('');
        setProgress(0);
        setShopping(false);
        setNote('');
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, task]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      ...(task || {}),
      title: title.trim(),
      priority,
      due,
      progress,
      shopping,
      note,
    });
  };

  const priorityColors = {
    '高': 'bg-[#e8b8b8] text-[#2c2c2c]',
    '中': 'bg-[#e8c88f] text-[#2c2c2c]',
    '低': 'bg-[#7fb88f] text-white',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-[16px] sm:rounded-[10px] border border-[#e0ddd5] shadow-md w-full max-w-md max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#1e3a5f] mb-4">
          {task ? 'タスクを編集' : '新しいタスク'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#2c2c2c] mb-1">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスク名を入力"
              className="w-full px-3 py-2 border border-[#e0ddd5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
              autoFocus
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-[#2c2c2c] mb-1">優先度</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    priority === p
                      ? priorityColors[p] + ' ring-2 ring-[#1e3a5f]/30'
                      : 'bg-gray-100 text-[#6b6b6b]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-[#2c2c2c] mb-1">期限</label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-full px-3 py-2 border border-[#e0ddd5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
            />
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-[#2c2c2c] mb-1">
              進捗: {progress}%
            </label>
            <div className="flex gap-1 items-center">
              {PROGRESS_VALUES.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setProgress(val)}
                  className={`flex-1 h-3 rounded-full transition-colors ${
                    val <= progress ? 'bg-[#1e3a5f]' : 'bg-gray-200'
                  }`}
                  title={`${val}%`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-[#6b6b6b] mt-0.5 px-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Shopping */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shopping}
              onChange={(e) => setShopping(e.target.checked)}
              className="w-4 h-4 rounded border-[#e0ddd5] accent-[#1e3a5f]"
            />
            <span className="text-sm text-[#2c2c2c]">買い物リスト</span>
          </label>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-[#2c2c2c] mb-1">メモ</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="メモを入力（任意）"
              rows={3}
              className="w-full px-3 py-2 border border-[#e0ddd5] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#e0ddd5] text-[#6b6b6b] text-sm hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm hover:bg-[#15304f] transition-colors disabled:opacity-40"
            >
              {task ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
