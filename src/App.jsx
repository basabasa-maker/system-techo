import { useState } from 'react';
import Header from './components/Header';
import DailyTab from './components/DailyTab';
import TaskTab from './components/TaskTab';
import NoteTab from './components/NoteTab';
import JournalTab from './components/JournalTab';
import { useLocalDate } from './hooks/useLocalDate';

function App() {
  const [activeTab, setActiveTab] = useState('Daily');
  const { currentDate, dateStr, goToPrevDay, goToNextDay, formatDate } = useLocalDate();

  const handleReload = () => {
    window.location.reload();
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'Daily':
        return <DailyTab dateStr={dateStr} currentDate={currentDate} />;
      case 'Task':
        return <TaskTab dateStr={dateStr} />;
      case 'Note':
        return <NoteTab />;
      case 'Journal':
        return <JournalTab />;
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
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 88px)' }}>
        {renderTab()}
      </div>
    </div>
  );
}

export default App;
