import { useState, useEffect } from 'react';

export default function NoteModal({ isOpen, note, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (note) {
        setTitle(note.title || '');
        setContent(note.content || '');
      } else {
        setTitle('');
        setContent('');
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, note]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      ...(note || {}),
      title: title.trim(),
      content,
    });
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
          {note ? 'ノートを編集' : '新しいノート'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#2c2c2c] mb-1">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ノートのタイトル"
              className="w-full px-3 py-2 border border-[#e0ddd5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
              autoFocus
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-[#2c2c2c] mb-1">内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ノートの内容を入力"
              rows={10}
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
              {note ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
