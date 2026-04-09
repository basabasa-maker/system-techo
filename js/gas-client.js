// gas-client.js - GAS API通信の薄いラッパー

export async function gasGet(gasUrl, params) {
  if (!gasUrl) throw new Error("GAS URLが未設定です");
  const url = gasUrl + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url, { mode: "cors", redirect: "follow" });
  if (!res.ok) throw new Error("GAS GET失敗: " + res.status);
  return res.json();
}

export async function gasPost(gasUrl, payload) {
  if (!gasUrl) throw new Error("GAS URLが未設定です");
  const res = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    mode: "cors",
    redirect: "follow",
  });
  if (!res.ok) throw new Error("GAS POST失敗: " + res.status);
  return res.json();
}
