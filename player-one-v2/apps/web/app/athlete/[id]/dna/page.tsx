export function generateStaticParams() {
  return [{ id: "demo" }, { id: "new" }];
}

import { DNAScoreChart } from "@/components/DNAScoreChart";

export default function AthleteDnaPage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-xl font-semibold">DNA Passport — {params.id}</h1>
      <p className="text-slate-400 text-sm">
        GET <code className="text-blue-400">/dna/&#123;athlete_id&#125;/score</code> и recommendations.
      </p>
      <DNAScoreChart />
    </main>
  );
}
