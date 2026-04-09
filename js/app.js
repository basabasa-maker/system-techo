// app.js - 初期化・タブ切替・更新ボタン・トースト・モーダル

import { pullAll, isGasConnected, getGasUrl, setGasUrl } from "./store.js";
import * as taskModule from "./task.js";
import * as dailyModule from "./daily.js";
import * as noteModule from "./note.js";
import * as journalModule from "./journal.js";

const TAB_MODULES = {
  task: taskModule,
  daily: dailyModule,
  note: noteModule,
  journal: journalModule,
};

let currentTab = "task";
let syncing = false;

// --- Init ---

document.addEventListener("DOMContentLoaded", () => {
  setupHeaderSpacer();
  setupTabs();
  setupSyncButton();
  setupGasWarning();
  switchTab("task");
});

// --- Header Spacer (ResizeObserver) ---

function setupHeaderSpacer() {
  const header = document.getElementById("app-header");
  const tabBar = document.getElementById("tab-bar");
  const spacer = document.getElementById("header-spacer");
  const warning = document.getElementById("gas-warning");

  const observer = new ResizeObserver(() => {
    let height = header.offsetHeight + tabBar.offsetHeight;
    if (warning.style.display !== "none") {
      height += warning.offsetHeight;
    }
    spacer.style.height = height + "px";
    // タブバーをヘッダー直下に配置
    tabBar.style.top = header.offsetHeight + "px";
  });

  observer.observe(header);
  observer.observe(tabBar);
  observer.observe(warning);
}

// --- Tab Switching ---

function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  // FABはTaskタブのみ表示
  if (tabName !== "task" && taskModule.hideFab) {
    taskModule.hideFab();
  }

  const contentEl = document.getElementById("tab-content");
  const mod = TAB_MODULES[tabName];
  if (mod) {
    mod.render(contentEl);
    if (mod.onActivate) mod.onActivate();
  }

  // スクロール位置リセット
  const scrollContainer = document.getElementById("scroll-container");
  scrollContainer.scrollTop = 0;
}

// --- Sync Button ---

function setupSyncButton() {
  const btn = document.getElementById("sync-btn");
  btn.addEventListener("click", async () => {
    if (syncing) return;
    if (!isGasConnected()) {
      showToast("GAS URLが未設定です", "error");
      return;
    }
    syncing = true;
    btn.classList.add("syncing");

    try {
      await pullAll();
      // 現在のタブを再描画
      const contentEl = document.getElementById("tab-content");
      const mod = TAB_MODULES[currentTab];
      if (mod) {
        mod.render(contentEl);
        if (mod.onActivate) mod.onActivate();
      }
      showToast("更新しました", "success");
    } catch (e) {
      showToast("更新失敗: " + e.message, "error");
    } finally {
      syncing = false;
      btn.classList.remove("syncing");
    }
  });
}

// --- GAS Warning ---

function setupGasWarning() {
  const warning = document.getElementById("gas-warning");
  const setupBtn = document.getElementById("gas-warning-setup");

  function updateWarning() {
    warning.style.display = isGasConnected() ? "none" : "flex";
    // spacerの再計算はResizeObserverが自動処理
  }

  setupBtn.addEventListener("click", () => {
    openGasSetupModal();
  });

  updateWarning();
  window._updateGasWarning = updateWarning;
}

function openGasSetupModal() {
  const currentUrl = getGasUrl();
  const html = `
    <div class="modal-title">
      <span>GAS URL設定</span>
      <button class="modal-close" data-action="close">×</button>
    </div>
    <div class="form-group">
      <label for="gas-url-input">GAS Web App URL</label>
      <input type="text" class="gas-setup-input" id="gas-url-input"
        value="${escapeAttr(currentUrl)}"
        placeholder="https://script.google.com/macros/s/...">
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="gas-url-save">保存</button>
    </div>
  `;

  openModal(html);

  document
    .querySelector('[data-action="close"]')
    .addEventListener("click", closeModal);
  document.getElementById("gas-url-save").addEventListener("click", () => {
    const url = document.getElementById("gas-url-input").value.trim();
    setGasUrl(url);
    closeModal();
    if (window._updateGasWarning) window._updateGasWarning();
    showToast(
      url ? "GAS URLを設定しました" : "GAS URLをクリアしました",
      "info",
    );
  });
}

// --- Toast ---

export function showToast(message, type) {
  type = type || "info";
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 3000);
}

// --- Modal ---

export function openModal(contentHtml) {
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");
  content.innerHTML = contentHtml;
  overlay.style.display = "flex";

  function onOverlayClick(e) {
    if (e.target === overlay) {
      closeModal();
      overlay.removeEventListener("click", onOverlayClick);
    }
  }
  overlay.removeEventListener("click", overlay._modalClickHandler);
  overlay._modalClickHandler = onOverlayClick;
  overlay.addEventListener("click", onOverlayClick);
}

export function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay._modalClickHandler) {
    overlay.removeEventListener("click", overlay._modalClickHandler);
    overlay._modalClickHandler = null;
  }
  overlay.style.display = "none";
  document.getElementById("modal-content").innerHTML = "";
}

// --- Utility ---

function escapeAttr(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Service Worker Registration ---

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
