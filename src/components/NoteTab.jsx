import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import NoteModal from './NoteModal';

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())} 更新`;
}

function renderContent(content) {
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return <div className="text-sm text-[#2c2c2c] leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return (
    <div className="text-sm text-[#2c2c2c] leading-relaxed whitespace-pre-wrap">
      {content}
    </div>
  );
}

export default function NoteTab({ notes, onUpdate }) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first
  const [expandedId, setExpandedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  const allNotes = notes || [];

  // Filter by search, then sort by date
  const filteredNotes = allNotes
    .filter((n) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const da = new Date(a.created || 0).getTime();
      const db = new Date(b.created || 0).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });

  const handleDelete = (note) => {
    setConfirmDialog({
      open: true,
      title: 'ノート削除',
      message: 'このノートを削除しますか？',
      onConfirm: () => {
        const updated = allNotes.filter((n) => n.id !== note.id);
        onUpdate(updated);
        if (expandedId === note.id) setExpandedId(null);
        setConfirmDialog((d) => ({ ...d, open: false }));
      },
    });
  };

  const handleSave = (noteData) => {
    if (noteData.id) {
      // Edit
      const updated = allNotes.map((n) =>
        n.id === noteData.id
          ? { ...n, ...noteData, created: new Date().toISOString() }
          : n
      );
      onUpdate(updated);
    } else {
      // New
      const newNote = {
        ...noteData,
        id: Date.now(),
        read: false,
        created: new Date().toISOString(),
      };
      onUpdate([newNote, ...allNotes]);
    }
    setModalOpen(false);
    setEditingNote(null);
  };

  const openEdit = (note) => {
    setEditingNote(note);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="pb-24">
      {/* Search */}
      <div className="sticky top-0 z-30 bg-[#f5f5f0] -mx-4 px-4 pb-2 pt-1">
      <div className="flex gap-2 mb-0">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] text-sm">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ノートを検索..."
            className="w-full pl-9 pr-3 py-2.5 border border-[#e0ddd5] rounded-[10px] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
          />
        </div>
        <button
          onClick={() => setSortOrder((o) => o === 'desc' ? 'asc' : 'desc')}
          className="flex-shrink-0 px-3 py-2.5 border border-[#e0ddd5] rounded-[10px] bg-white text-xs text-[#6b6b6b] hover:bg-[#f5f5f0] transition-colors"
          title={sortOrder === 'desc' ? '新しい順' : '古い順'}
        >
          {sortOrder === 'desc' ? '新↓' : '古↑'}
        </button>
      </div>
      </div>

      {/* Note List */}
      {filteredNotes.length === 0 ? (
        <div className="text-center text-[#6b6b6b] text-sm py-12">
          {search ? '検索結果がありません' : 'ノートがありません'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const isExpanded = expandedId === note.id;
            return (
              <div
                key={note.id}
                className="bg-white rounded-[10px] border border-[#e0ddd5] shadow-sm overflow-hidden"
              >
                {/* Header - always visible */}
                <button
                  onClick={() => toggleExpand(note.id)}
                  className="w-full text-left p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[#1e3a5f] text-sm truncate">{note.title}</h4>
                    <p className="text-xs text-[#6b6b6b] mt-0.5">{formatDate(note.created)}</p>
                  </div>
                  <span className="text-[#6b6b6b] text-xs flex-shrink-0">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#e0ddd5]">
                    <div className="pt-3 pb-2">
                      {renderContent(note.content || '')}
                    </div>
                    <div className="flex justify-end gap-1 pt-2">
                      <button
                        onClick={() => openEdit(note)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-sm"
                        title="編集"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(note)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-sm"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
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

      {/* Note Modal */}
      <NoteModal
        isOpen={modalOpen}
        note={editingNote}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditingNote(null); }}
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
