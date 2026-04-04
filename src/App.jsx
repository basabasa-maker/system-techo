import { useState } from 'react';
import Header from './components/Header';
import DailyTab from './components/DailyTab';
import TaskTab from './components/TaskTab';
import NoteTab from './components/NoteTab';
import JournalTab from './components/JournalTab';
import { useLocalDate } from './hooks/useLocalDate';
import { useGasSync } from './hooks/useGasSync';

function App() {
  const [activeTab, setActiveTab] = useState('Daily');
  const { currentDate, dateStr, goToPrevDay, goToNextDay, formatDate } = useLocalDate();
  const {
    notes, tasks, journal, daily, calendarEvents,
    loading, saving, error,
    updateNotes, updateTasks, updateJournal, updateDaily,
    loadCalendar, reload,
  } = useGasSync();

  const handleReload = () => {
    reload();
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'Daily':
        return (
          <DailyTab
            dateStr={dateStr}
            entries={daily}
            calendarEvents={calendarEvents}
            onUpdate={updateDaily}
            tasks={tasks}
            onTasksUpdate={updateTasks}
            loadCalendar={loadCalendar}
          />
        );
      case 'Task':
        return <TaskTab tasks={tasks} onUpdate={updateTasks} dateStr={dateStr} />;
      case 'Note':
        return <NoteTab notes={notes} onUpdate={updateNotes} />;
      case 'Journal':
        return <JournalTab journal={journal} onUpdate={updateJournal} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ backgroundColor: '#f5f5f0', minHeight: '100vh' }}>
      <Header
        dateDisplay={formatDate()}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
        onReload={handleReload}
      />
      {/* Spacer for fixed header */}
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 104px)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm" style={{ color: '#6b6b6b' }}>読み込み中...</div>
          </div>
        ) : (
          renderTab()
        )}
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-2 right-2 z-[200] bg-[#1e3a5f] text-white text-xs px-3 py-1 rounded-full opacity-80">
          保存中...
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-20 left-4 right-4 z-[200] bg-[#e8b8b8] text-[#2c2c2c] text-sm px-4 py-2 rounded-lg shadow-md text-center">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
