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

function formatDue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
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
      if (filter === 'active') return t.status === 'active';
      if (filter === 'completed') return t.status === 'completed';
      if (filter === 'shopping') return t.shopping && t.status === 'active';
      return true; // 'all'
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
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
    <div className="pb-24">
      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
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

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center text-[#6b6b6b] text-sm py-12">
          タスクがありません
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            return (
              <div
                key={task.id}
                className={`bg-white rounded-[10px] border border-[#e0ddd5] shadow-sm p-4 transition-opacity ${
                  isCompleted ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => isCompleted ? handleUncomplete(task) : handleComplete(task)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isCompleted
                        ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                        : 'border-[#e0ddd5] hover:border-[#1e3a5f]'
                    }`}
                  >
                    {isCompleted && (
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
                          isCompleted ? 'line-through text-[#6b6b6b]' : ''
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
                    <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1e3a5f] rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      {task.due && (
                        <span className="text-xs text-[#6b6b6b]">
                          期限: {formatDue(task.due)}
                        </span>
                      )}
                      <span className="text-xs text-[#6b6b6b]">{task.progress}%</span>
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
