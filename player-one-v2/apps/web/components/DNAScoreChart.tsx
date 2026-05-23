"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

/** §6.2 DNAScoreChart — данные из GET /dna/:id/score */
export function DNAScoreChart() {
  const data = [
    { axis: "Взрыв", value: 62 },
    { axis: "Выносл.", value: 55 },
    { axis: "Травмы", value: 48 },
  ];
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
