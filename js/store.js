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
      localStorage.setItem(
        STORAGE_KEYS.journal,
        JSON.stringify(result.data.journal),
      );
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

export function getDaily() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.daily);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
