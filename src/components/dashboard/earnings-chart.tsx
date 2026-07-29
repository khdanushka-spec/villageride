"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EarningsChart({
  data,
  label = "Earnings",
  currencyPrefix = "LKR ",
}: {
  data: { date: string; amount: number }[];
  label?: string;
  currencyPrefix?: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
          <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" width={40} />
          <Tooltip
            cursor={{ fill: "var(--color-muted)" }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${currencyPrefix}${Number(value).toLocaleString()}`, label]}
          />
          <Bar dataKey="amount" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
