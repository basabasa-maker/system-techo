import { useState, useEffect, useRef, useCallback } from "react";
import { fetchData, saveData } from "../utils/gasApi";

const LS_KEYS = {
  notes: "techo-notes",
  tasks: "techo-tasks",
  journal: "techo-journal",
  daily: "techo-daily",
};

function loadFromLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("localStorage parse error:", key, e);
  }
  return null;
}

function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("localStorage save error:", key, e);
  }
}

export function useGasSync() {
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [journal, setJournal] = useState({});
  const [daily, setDaily] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Debounce timers for each data type
  const timers = useRef({
    notes: null,
    tasks: null,
    journal: null,
    daily: null,
  });

  // Track whether initial load is done
  const initialized = useRef(false);

  // Load all data on mount
  // On mount: load from localStorage only (offline-first, fast)
  useEffect(() => {
    const n = loadFromLocalStorage(LS_KEYS.notes) || [];
    const t = loadFromLocalStorage(LS_KEYS.tasks) || [];
    const j = loadFromLocalStorage(LS_KEYS.journal) || {};
    const d = loadFromLocalStorage(LS_KEYS.daily) || [];

    setNotes(n);
    setTasks(t);
    setJournal(j);
    setDaily(d);

    setLoading(false);
    initialized.current = true;
  }, []);

  // Generic debounced save
  const debouncedSave = useCallback((type, data) => {
    // Save to localStorage immediately
    saveToLocalStorage(LS_KEYS[type], data);

    // Clear existing timer
    if (timers.current[type]) {
      clearTimeout(timers.current[type]);
    }

    // Set new timer for GAS save
    timers.current[type] = setTimeout(async () => {
      setSaving(true);
      setError(null);

      // Journal is stored as object locally but GAS expects array
      const itemsToSave = type === "journal" ? Object.values(data) : data;
      const result = await saveData(type, itemsToSave);

      if (!result || !result.success) {
        setError(`${type}の保存に失敗しました`);
        // Data is already in localStorage, so it won't be lost
      }

      setSaving(false);
    }, 2500);
  }, []);

  // Update functions
  const updateNotes = useCallback(
    (newNotes) => {
      const updated =
        typeof newNotes === "function" ? newNotes(notes) : newNotes;
      setNotes(updated);
      if (initialized.current) {
        debouncedSave("notes", updated);
      }
    },
    [notes, debouncedSave],
  );

  const updateTasks = useCallback(
    (newTasks) => {
      const updated =
        typeof newTasks === "function" ? newTasks(tasks) : newTasks;
      setTasks(updated);
      if (initialized.current) {
        debouncedSave("tasks", updated);
      }
    },
    [tasks, debouncedSave],
  );

  const updateJournal = useCallback(
    (newJournal) => {
      const updated =
        typeof newJournal === "function" ? newJournal(journal) : newJournal;
      setJournal(updated);
      if (initialized.current) {
        debouncedSave("journal", updated);
      }
    },
    [journal, debouncedSave],
  );

  const updateDaily = useCallback(
    (newDaily) => {
      const updated =
        typeof newDaily === "function" ? newDaily(daily) : newDaily;
      setDaily(updated);
      if (initialized.current) {
        debouncedSave("daily", updated);
      }
    },
    [daily, debouncedSave],
  );

  const loadCalendar = useCallback(async (dateStr) => {
    const result = await fetchData("calendar", { date: dateStr });
    if (result && result.success) {
      setCalendarEvents(result.events || []);
    } else {
      setCalendarEvents([]);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchData("all");

    if (result && result.success) {
      const n = result.notes || [];
      const t = result.tasks || [];

      // Journal: GAS returns array, convert to object keyed by date
      const journalArray = result.journal || [];
      const j = Array.isArray(journalArray)
        ? (() => {
            const obj = {};
            journalArray.forEach((entry) => {
              if (entry.date) {
                let dateKey = entry.date;
                if (
                  dateKey instanceof Date ||
                  (typeof dateKey === "string" && dateKey.includes("T"))
                ) {
                  const dt = new Date(dateKey);
                  dateKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                }
                obj[dateKey] = { ...entry, date: dateKey };
              }
            });
            return obj;
          })()
        : journalArray;

      // Daily: normalize date strings and numeric fields, filter empty rows
      const d = (result.daily || [])
        .filter((entry) => entry.date && entry.date !== "" && entry.id)
        .map((entry) => ({
          ...entry,
          date: (() => {
            let dd = entry.date;
            if (
              dd instanceof Date ||
              (typeof dd === "string" && dd.includes("T"))
            ) {
              const dt = new Date(dd);
              return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
            }
            return dd;
          })(),
          hour: Number(entry.hour),
          endHour:
            entry.endHour !== "" && entry.endHour != null
              ? Number(entry.endHour)
              : "",
        }));

      setNotes(n);
      setTasks(t);
      setJournal(j);
      setDaily(d);

      saveToLocalStorage(LS_KEYS.notes, n);
      saveToLocalStorage(LS_KEYS.tasks, t);
      saveToLocalStorage(LS_KEYS.journal, j);
      saveToLocalStorage(LS_KEYS.daily, d);
    } else {
      setError("データの再読み込みに失敗しました");
    }

    setLoading(false);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => {
        if (t) clearTimeout(t);
      });
    };
  }, []);

  return {
    notes,
    tasks,
    journal,
    daily,
    calendarEvents,
    loading,
    saving,
    error,
    updateNotes,
    updateTasks,
    updateJournal,
    updateDaily,
    loadCalendar,
    reload,
  };
}
