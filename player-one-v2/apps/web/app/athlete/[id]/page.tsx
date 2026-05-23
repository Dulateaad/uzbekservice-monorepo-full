export function generateStaticParams() {
  return [{ id: "demo" }, { id: "new" }];
}

import Link from "next/link";

export default function AthletePage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-4">
      <h1 className="text-xl font-semibold">Атлет {params.id}</h1>
      <Link href={`/athlete/${params.id}/dna`} className="text-blue-400 hover:underline">
        DNA Passport →
      </Link>
      <p className="text-slate-500 text-sm">История сессий и метрики — Firestore + TanStack Query.</p>
    </main>
  );
}
