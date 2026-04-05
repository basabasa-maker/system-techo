import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import DailyTab from './components/DailyTab';
import TaskTab from './components/TaskTab';
import NoteTab from './components/NoteTab';
import JournalTab from './components/JournalTab';
import { useLocalDate } from './hooks/useLocalDate';
import { useGasSync } from './hooks/useGasSync';

function App() {
  const [activeTab, setActiveTab] = useState('Daily');
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(104);
  const { currentDate, dateStr, goToPrevDay, goToNextDay, formatDate } = useLocalDate();
  const {
    notes, tasks, journal, daily, calendarEvents,
    loading, saving, error,
    updateNotes, updateTasks, updateJournal, updateDaily,
    loadCalendar, reload,
  } = useGasSync();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => setHeaderHeight(header.offsetHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // Auto-dismiss error after 3 seconds
  const [showError, setShowError] = useState(false);
  useEffect(() => {
    if (error) {
      setShowError(true);
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
    setShowError(false);
  }, [error]);

  const handleReload = () => {
    reload();
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'Daily':
        return (
          <DailyTab
            dateStr={dateStr}
            currentDate={currentDate}
            entries={daily}
            calendarEvents={calendarEvents}
            onUpdate={updateDaily}
            tasks={tasks}
            onTasksUpdate={updateTasks}
            loadCalendar={loadCalendar}
          />
        );
      case 'Task':
        return (
          <TaskTab
            dateStr={dateStr}
            tasks={tasks}
            onUpdate={updateTasks}
          />
        );
      case 'Note':
        return (
          <NoteTab
            notes={notes}
            onUpdate={updateNotes}
          />
        );
      case 'Journal':
        return (
          <JournalTab
            journal={journal}
            onUpdate={updateJournal}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ backgroundColor: '#f5f5f0', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        ref={headerRef}
        dateDisplay={formatDate()}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
        onReload={handleReload}
      />
      {/* Spacer for fixed header */}
      <div style={{ height: `${headerHeight}px`, flexShrink: 0 }} />
      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-[#6b6b6b]">読み込み中...</span>
          </div>
        )}

        {/* Content */}
        {!loading && renderTab()}
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1e3a5f] text-white text-xs px-4 py-2 rounded-full shadow-lg z-50 animate-pulse">
          保存中...
        </div>
      )}

      {/* Error toast */}
      {showError && error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">
          保存失敗: {error}
        </div>
      )}
    </div>
  );
}

export default App;
