import "./style.css";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";
const msg = document.getElementById("msg")!;
const frame = document.getElementById("call") as HTMLIFrameElement;

function getGrantId(): string | null {
  const q = new URLSearchParams(window.location.search);
  return q.get("g");
}

async function main() {
  const grantId = getGrantId();
  if (!grantId) {
    msg.textContent =
      "Некорректная ссылка. Ожидается параметр ?g= в URL (выдаётся вместе с приглашением).";
    return;
  }

  try {
    const r = await fetch(`${apiBase}/video/token-by-grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantId }),
    });
    const j = (await r.json()) as { token?: string; roomUrl?: string; error?: string };
    if (!r.ok) {
      msg.textContent = `Ошибка: ${j.error || r.statusText}`;
      return;
    }
    if (!j.token || !j.roomUrl) {
      msg.textContent = "Пустой ответ сервера.";
      return;
    }
    const sep = j.roomUrl.includes("?") ? "&" : "?";
    frame.src = `${j.roomUrl}${sep}t=${encodeURIComponent(j.token)}`;
    frame.hidden = false;
    msg.textContent = "Подключение к видео… Разрешите доступ к камере и микрофону.";
  } catch (e) {
    msg.textContent = `Сеть: ${String(e)}`;
  }
}

main();
