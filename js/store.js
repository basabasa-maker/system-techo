// store.js - 状態管理（localStorage + GAS同期）

import { gasGet, gasPost } from "./gas-client.js";

const DEFAULT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbyEiStixBx3CpzMJiD3f2pLtMi_TtZLkyCmvVCDmdU_6B2uGbUmb5W64HACymFDyX7Asg/exec";

const STORAGE_KEYS = {
  tasks: "system-techo-v2-tasks",
  notes: "system-techo-v2-notes",
  journal: "system-techo-v2-journal",
  daily: "system-techo-v2-daily",
  gasUrl: "system-techo-v2-gas-url",
};

// --- GAS URL管理 ---

export function getGasUrl() {
  return localStorage.getItem(STORAGE_KEYS.gasUrl) || DEFAULT_GAS_URL;
}

export function setGasUrl(url) {
  localStorage.setItem(STORAGE_KEYS.gasUrl, url);
}

export function isGasConnected() {
  return !!getGasUrl();
}

// --- Tasks ---

export function getTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tasks);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

export async function syncTask(task) {
  const url = getGasUrl();
  if (!url) return { success: false, error: "GAS URL未設定" };
  try {
    const result = await gasPost(url, { type: "task_upsert", item: task });
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function deleteTask(id) {
  const url = getGasUrl();
  if (!url) return { success: false, error: "GAS URL未設定" };
  try {
    const result = await gasPost(url, { type: "task_delete", id: id });
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- Pull All ---

export async function pullAll() {
  const url = getGasUrl();
  if (!url) throw new Error("GAS URLが未設定です");
  const result = await gasGet(url, { type: "all" });
  if (result.success && result.data) {
    if (result.data.tasks) {
      localStorage.setItem(
        STORAGE_KEYS.tasks,
        JSON.stringify(result.data.tasks),
      );
    }
    if (result.data.notes) {
      localStorage.setItem(
        STORAGE_KEYS.notes,
        JSON.stringify(result.data.notes),
      );
    }
    if (result.data.journal) {
      // 重要: GASの type:"all" は「当日分のみ」しか返さないため、
      // 全件上書きすると過去データが消失する（過去に発生した重大事故の原因）。
      // 当日分だけを既存キャッシュにマージする。
      mergeJournalByDate(result.data.journal);
    }
    if (result.data.daily) {
      localStorage.setItem(
        STORAGE_KEYS.daily,
        JSON.stringify(result.data.daily),
      );
    }
  }
  return result;
}

// --- Notes / Journal (Sprint 2以降で使用) ---

export function getNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.notes);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getJournal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.journal);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Journalを月単位でマージ保存（過去データを残したまま該当月だけ差し替え）
export function mergeJournalByMonth(yearMonth, entries) {
  if (!yearMonth || !Array.isArray(entries)) return;
  const existing = getJournal();
  // 該当月以外を残す
  const others = existing.filter((e) => {
    const d = String(e && e.date ? e.date : "");
    return d.substring(0, 7) !== yearMonth;
  });
  const merged = others.concat(entries);
  localStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(merged));
}

// GetAllで返ってきた当日分だけを既存キャッシュにマージ
// （IDで置換。該当IDがなければ追加。他の日のエントリには触らない）
function mergeJournalByDate(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return;
  const existing = getJournal();
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const e of entries) {
    if (e && e.id) byId.set(e.id, e);
  }
  const merged = Array.from(byId.values());
  localStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(merged));
}

// Journalを指定日のみGASから取得してマージ保存（単一日再取得用）
export async function fetchJournalDay(dateStr) {
  const url = getGasUrl();
  if (!url) throw new Error("GAS URLが未設定です");
  const result = await gasGet(url, { type: "journal", date: dateStr });
  if (!result.success || !result.data) return [];
  const entries = result.data.journal || result.data.entries || [];
  // 既存の該当日エントリを削除して差し替え
  const existing = getJournal();
  const others = existing.filter((e) => {
    return !e || String(e.date) !== dateStr;
  });
  const merged = others.concat(entries);
  localStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(merged));
  return entries;
}

export function getDaily() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.daily);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
