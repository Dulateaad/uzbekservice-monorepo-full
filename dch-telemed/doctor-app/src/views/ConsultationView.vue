<template>
  <div class="wrap">
    <section class="toolbar">
      <label>ID записи (Firestore)</label>
      <input v-model="appointmentId" placeholder="appointment doc id" />
      <button type="button" :disabled="busy" @click="prepareRoom">Подготовить комнату</button>
      <button type="button" :disabled="busy || !roomUrl" @click="startVideo">Подключиться к видео</button>
      <span v-if="status" class="status">{{ status }}</span>
    </section>

    <div class="split">
      <div class="pane video-pane">
        <h3>Видео (Daily Prebuilt)</h3>
        <div v-if="!iframeSrc" class="placeholder">Подготовьте комнату и нажмите «Подключиться».</div>
        <iframe
          v-else
          class="daily-frame"
          :src="iframeSrc"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
        />
      </div>
      <div class="pane emk-pane">
        <h3>Электронная медицинская карта</h3>
        <div class="emk-placeholder">
          Здесь встраивается существующий модуль ЭМК DCH (iframe или компонент). MVP: заглушка.
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { auth } from "../firebase";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

async function authHeader() {
  const u = auth.currentUser;
  if (!u) throw new Error("Нужен вход (страница «Вход»).");
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export default {
  name: "ConsultationView",
  data() {
    return {
      appointmentId: "",
      busy: false,
      status: "",
      roomUrl: "",
      iframeSrc: "",
    };
  },
  methods: {
    async prepareRoom() {
      this.status = "";
      if (!this.appointmentId.trim()) {
        this.status = "Укажите ID записи.";
        return;
      }
      this.busy = true;
      try {
        const headers = {
          "Content-Type": "application/json",
          ...(await authHeader()),
        };
        const r = await fetch(
          `${apiBase}/appointments/${encodeURIComponent(this.appointmentId.trim())}/video/prepare`,
          { method: "POST", headers }
        );
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || r.statusText);
        this.roomUrl = j.roomUrl;
        this.status = j.alreadyExisted ? "Комната уже была." : "Комната создана.";
      } catch (e) {
        this.status = e.message || String(e);
      } finally {
        this.busy = false;
      }
    },
    async startVideo() {
      this.status = "";
      if (!this.appointmentId.trim() || !this.roomUrl) {
        this.status = "Сначала подготовьте комнату.";
        return;
      }
      this.busy = true;
      try {
        const headers = {
          "Content-Type": "application/json",
          ...(await authHeader()),
        };
        const r = await fetch(`${apiBase}/video/token`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            appointmentId: this.appointmentId.trim(),
            role: "doctor",
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || r.statusText);
        const sep = this.roomUrl.includes("?") ? "&" : "?";
        this.iframeSrc = `${this.roomUrl}${sep}t=${encodeURIComponent(j.token)}`;
        this.status = "Видео загружается…";
      } catch (e) {
        this.status = e.message || String(e);
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: calc(100vh - 5rem);
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
  background: #fff;
  padding: 1rem;
  border-radius: 10px;
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.06);
}
.toolbar label {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  color: #64748bbc;
}
.toolbar input {
  min-width: 220px;
  margin-top: 0.2rem;
  padding: 0.45rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}
.toolbar button {
  padding: 0.5rem 0.9rem;
  background: #0f766e;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.status {
  font-size: 0.9rem;
  color: #0f766e;
}
.split {
  flex: 1;
  display: flex;
  gap: 1rem;
  min-height: 0;
}
.pane {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.06);
}
.pane h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: #334155;
}
.daily-frame {
  flex: 1;
  border: none;
  border-radius: 8px;
  background: #000;
  min-height: 320px;
}
.placeholder,
.emk-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 0.95rem;
  text-align: center;
  padding: 1rem;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}
@media (max-width: 900px) {
  .split {
    flex-direction: column;
  }
}
</style>
