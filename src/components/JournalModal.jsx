import { useState, useEffect, useRef } from 'react';
import { formatDisplayDate } from '../utils/dateUtils';

export default function JournalModal({ isOpen, entry, date, onSave, onClose }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setText(entry ? entry.text : '');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, entry]);

  if (!isOpen) return null;

  const displayDate = date ? formatDisplayDate(new Date(date + 'T00:00:00')) : '';

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-[16px] sm:rounded-[10px] border border-[#e0ddd5] shadow-lg w-full sm:max-w-lg sm:mx-4 p-5 pb-8 sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#2c2c2c]">
            {entry ? 'ジャーナル編集' : '新しいジャーナル'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#6b6b6b] hover:text-[#2c2c2c] transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Date display */}
        <p className="text-sm text-[#6b6b6b] mb-3">{displayDate}</p>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="今日のことを書いてみましょう..."
          className="w-full h-48 sm:h-56 p-3 border border-[#e0ddd5] rounded-lg text-[#2c2c2c] text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] placeholder-[#b0b0b0]"
        />

        {/* Buttons */}
        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-[#e0ddd5] text-[#6b6b6b] text-sm hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="px-5 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm hover:bg-[#15304f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
