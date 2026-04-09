// url-utils.js - URL自動リンク化

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

export function linkify(text) {
  if (!text) return "";
  const escaped = escapeHtml(text);
  return escaped.replace(URL_REGEX, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="auto-link">${url}</a>`;
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
