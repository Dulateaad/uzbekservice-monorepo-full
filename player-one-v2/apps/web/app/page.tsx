import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Player One v2</h1>
      <p className="text-slate-400 text-sm leading-relaxed">
        Каркас Next.js 14 по ТЗ §6. Подключите Firebase и URL FastAPI (Cloud Run) через переменные окружения.
      </p>
      <ul className="space-y-2 text-blue-400">
        <li>
          <Link href="/dashboard">/dashboard</Link> — последние сессии, риски
        </li>
        <li>
          <Link href="/upload">/upload</Link> — загрузка видео (метаданные → Storage + jobs)
        </li>
        <li>
          <Link href="/session/demo-session">/session/[id]</Link> — видео + MoCap + ТТД
        </li>
        <li>
          <Link href="/session/demo-session/validate">/session/[id]/validate</Link> — правило 45 с
        </li>
        <li>
          <Link href="/athlete/demo">/athlete/[id]</Link> — профиль
        </li>
        <li>
          <Link href="/athlete/demo/dna">/athlete/[id]/dna</Link> — DNA Passport
        </li>
        <li>
          <Link href="/admin">/admin</Link> — админ (заглушка RBAC)
        </li>
      </ul>
    </main>
  );
}
