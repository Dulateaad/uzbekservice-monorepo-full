"use client";

import { useState } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { getFirebase } from "@/lib/firebase";
import { postAnalyzeVideoStorage } from "@/lib/player-one-api";
import { usePlayerOneAuth } from "@/components/PlayerOneProviders";
import Link from "next/link";

/** ТЗ §6 — загрузка в Storage + POST /api/analyze-video-storage */
export default function UploadPage() {
  const { user, loading: authLoading, firebaseOk, signInWithGoogle, getIdToken } = usePlayerOneAuth();
  const [sport, setSport] = useState("football");
  const [engine, setEngine] = useState<"auto" | "gemini" | "local">("gemini");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  async function onFile(file: File | null) {
    setError(null);
    setJobId(null);
    if (!file || !user) return;
    setBusy(true);
    try {
      const { storage } = getFirebase();
      const path = `uploads/${user.uid}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
      const r = ref(storage, path);
      await uploadBytes(r, file, { contentType: file.type || "video/mp4" });
      const token = await getIdToken();
      if (!token) throw new Error("Нет токена");
      const res = await postAnalyzeVideoStorage(
        {
          storage_path: path,
          filename: file.name,
          sport,
          analysis_engine: engine,
          session_id: "",
        },
        token
      );
      setJobId(res.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-xl font-semibold">Загрузка видео</h1>

      {!firebaseOk && (
        <p className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          Задайте переменные <code className="text-amber-300">NEXT_PUBLIC_FIREBASE_*</code> в{" "}
          <code className="text-amber-300">.env.local</code> (см. .env.example).
        </p>
      )}

      {firebaseOk && !authLoading && !user && (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">Войдите через Google, чтобы загрузить файл и запустить анализ.</p>
          <button
            type="button"
            onClick={() => signInWithGoogle().catch((e) => setError(String(e)))}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900"
          >
            Войти с Google
          </button>
        </div>
      )}

      {user && (
        <>
          <p className="text-slate-500 text-xs">Пользователь: {user.email ?? user.uid}</p>
          <label className="block text-sm">
            <span className="text-slate-400">Дисциплина</span>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
            >
              <option value="football">Футбол</option>
              <option value="basketball">Баскетбол</option>
              <option value="boxing">Бокс</option>
              <option value="wrestling">Борьба</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Движок анализа</span>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as typeof engine)}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
            >
              <option value="auto">auto</option>
              <option value="gemini">gemini</option>
              <option value="local">local</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-600 p-6 text-center text-sm text-slate-400">
            <span>MP4 / MOV — загрузка в Storage → Cloud Run анализ</span>
            <input
              type="file"
              accept="video/*"
              disabled={busy}
              className="mx-auto text-xs file:mr-2 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-white"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </>
      )}

      {busy && <p className="text-sm text-slate-400">Загрузка и запуск анализа…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {jobId && (
        <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          Задача создана: <code className="text-emerald-300">{jobId}</code>
          <div className="mt-2">
            <Link href={`/dashboard?jobId=${encodeURIComponent(jobId)}`} className="text-blue-400 underline">
              Открыть дашборд
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
