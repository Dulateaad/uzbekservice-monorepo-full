import { ValidationCard } from "@/components/ValidationCard";

export function generateStaticParams() {
  return [{ id: "demo-session" }, { id: "new" }];
}

/** §3.4 правило 45 с — быстрая верификация черновика */
export default function ValidatePage({ params }: { params: { id: string } }) {
  const demo = [0.92, 0.71, 0.88, 0.65, 0.79, 0.83, 0.91, 0.74, 0.86, 0.69];
  return (
    <main className="mx-auto max-w-lg p-8 space-y-6">
      <h1 className="text-xl font-semibold">Валидация сессии {params.id}</h1>
      <p className="text-slate-400 text-sm">
        Горячие клавиши: пробел — подтвердить, Delete — отклонить, E — редактировать (ТЗ §3.4).
      </p>
      <div className="space-y-2">
        {demo.map((c, i) => (
          <ValidationCard key={i} confidence={c} label={`Событие ${i + 1}`} />
        ))}
      </div>
    </main>
  );
}
