const TABS = ['Daily', 'Task', 'Note', 'Journal'];

export default function Header({
  dateDisplay,
  activeTab,
  onTabChange,
  onPrevDay,
  onNextDay,
  onReload,
}) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: '#1e3a5f' }}
    >
      {/* Safe area padding for iPhone notch */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Row 1: Date navigation */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={onPrevDay}
            className="text-white text-xl w-10 h-10 flex items-center justify-center active:opacity-60"
            aria-label="Previous day"
          >
            &#8592;
          </button>
          <span className="text-white text-base font-medium tracking-wide">
            {dateDisplay}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onNextDay}
              className="text-white text-xl w-10 h-10 flex items-center justify-center active:opacity-60"
              aria-label="Next day"
            >
              &#8594;
            </button>
            <button
              onClick={onReload}
              className="text-white text-lg w-10 h-10 flex items-center justify-center active:opacity-60"
              aria-label="Reload"
            >
              &#8635;
            </button>
          </div>
        </div>

        {/* Row 2: Tab bar */}
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className="flex-1 py-2 text-center transition-opacity"
                style={{
                  color: 'white',
                  opacity: isActive ? 1 : 0.5,
                  fontSize: '14px',
                  fontWeight: 700,
                  borderBottom: isActive ? '2px solid white' : '2px solid transparent',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
