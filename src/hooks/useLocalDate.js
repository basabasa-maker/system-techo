import { useState, useCallback } from 'react';
import { formatDisplayDate, localDateStr } from '../utils/dateUtils';

export function useLocalDate() {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const goToPrevDay = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1);
      return d;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const formatDate = useCallback(() => {
    return formatDisplayDate(currentDate);
  }, [currentDate]);

  const dateStr = localDateStr(currentDate);

  return {
    currentDate,
    dateStr,
    goToPrevDay,
    goToNextDay,
    goToToday,
    formatDate,
  };
}
