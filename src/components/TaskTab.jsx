import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import TaskModal from './TaskModal';

const FILTERS = [
  { key: 'active', label: '未完了' },
  { key: 'all', label: 'すべて' },
  { key: 'completed', label: '完了' },
  { key: 'shopping', label: '買い物' },
];

const PRIORITY_ORDER = { '高': 0, '中': 1, '低': 2 };

const PRIORITY_COLORS = {
  '高': 'bg-[#e8b8b8] text-[#2c2c2c]',
  '中': 'bg-[#e8c88f] text-[#2c2c2c]',
  '低': 'bg-[#7fb88f] text-white',
};

function isCompleted(task) {
  const s = String(task.status || '').toLowerCase();
  return s === 'completed' || s === '完了';
}

function formatDue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TaskTab({ tasks, onUpdate }) {
  const [filter, setFilter] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  const allTasks = tasks || [];

  // Filter tasks
  const filteredTasks = allTasks
    .filter((t) => {
      if (filter === 'active') return !isCompleted(t);
      if (filter === 'completed') return isCompleted(t);
      if (filter === 'shopping') return t.shopping && !isCompleted(t);
      return true; // 'all'
    })
    .sort((a, b) => {
      const aComp = isCompleted(a);
      const bComp = isCompleted(b);
      if (aComp !== bComp) return aComp ? 1 : -1;
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (pDiff !== 0) return pDiff;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });

  const handleComplete = (task) => {
    setConfirmDialog({
      open: true,
      title: 'タスク完了',
      message: 'このタスクを完了しますか？',
      onConfirm: () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const completedDate = `${y}-${m}-${d}`;

        const updated = allTasks.map((t) =>
          t.id === task.id
            ? { ...t, status: 'completed', progress: 100, completedDate }
            : t
        );
        onUpdate(updated);
        setConfirmDialog((d) => ({ ...d, open: false }));
      },
    });
  };

  const handleUncomplete = (task) => {
    const updated = allTasks.map((t) =>
      t.id === task.id ? { ...t, status: 'active', progress: 75, completedDate: '' } : t
    );
    onUpdate(updated);
  };

  const handleDelete = (task) => {
    setConfirmDialog({
      open: true,
      title: 'タスク削除',
      message: 'このタスクを削除しますか？',
      onConfirm: () => {
        const updated = allTasks.filter((t) => t.id !== task.id);
        onUpdate(updated);
        setConfirmDialog((d) => ({ ...d, open: false }));
      },
    });
  };

  const handleSave = (taskData) => {
    if (taskData.id) {
      // Edit
      const updated = allTasks.map((t) => (t.id === taskData.id ? { ...t, ...taskData } : t));
      onUpdate(updated);
    } else {
      // New
      const newTask = {
        ...taskData,
        id: Date.now(),
        status: 'active',
        created: new Date().toISOString(),
        completedDate: '',
        progress: taskData.progress ?? 0,
        shopping: taskData.shopping ?? false,
      };
      onUpdate([...allTasks, newTask]);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  return (
    <div className="pb-24 overflow-x-hidden">
      {/* Filter Bar */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+104px)] z-30 bg-[#f5f5f0] -mx-4 px-4 pb-2 pt-1">
      <div className="flex gap-2 overflow-x-auto pb-2 mb-0 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-white text-[#6b6b6b] border border-[#e0ddd5]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center text-[#6b6b6b] text-sm py-12">
          タスクがありません
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const completed = isCompleted(task);
            const progress = Number(task.progress) || 0;
            return (
              <div
                key={task.id}
                className={`bg-white rounded-[10px] border border-[#e0ddd5] shadow-sm p-4 transition-opacity ${
                  completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => completed ? handleUncomplete(task) : handleComplete(task)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      completed
                        ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                        : 'border-[#e0ddd5] hover:border-[#1e3a5f]'
                    }`}
                  >
                    {completed && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold text-[#2c2c2c] text-sm ${
                          completed ? 'line-through text-[#6b6b6b]' : ''
                        }`}
                      >
                        {task.shopping && <span className="mr-1">🛒</span>}
                        {task.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex gap-1 mt-2">
                      {[25, 50, 75, 100].map((val) => (
                        <div
                          key={val}
                          className={`h-1.5 flex-1 rounded-full ${
                            val <= progress ? 'bg-[#1e3a5f]' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      {task.due && (
                        <span className="text-xs text-[#6b6b6b]">
                          期限: {formatDue(task.due)}
                        </span>
                      )}
                      <span className="text-xs text-[#6b6b6b]">{progress}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(task)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-sm"
                      title="編集"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-sm"
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-[#1e3a5f] text-white text-2xl shadow-lg hover:bg-[#15304f] transition-colors flex items-center justify-center z-40"
      >
        +
      </button>

      {/* Task Modal */}
      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
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
