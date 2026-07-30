"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 11, fill: "#9A9AA2" };

const tooltipStyle = {
  backgroundColor: "#1C1C20",
  border: "1px solid #2E2E34",
  borderRadius: 8,
  fontSize: 12,
  color: "#F5F4F3",
};

export function DashboardCharts({
  byAssignee,
  byMonth,
}: {
  byAssignee: { name: string; color: string; total: number; done: number }[];
  byMonth: { month: string; count: number }[];
}) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="card p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-faint">
          Tarefas por responsável
        </h3>
        {byAssignee.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-faint">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, byAssignee.length * 42)}>
            <BarChart data={byAssignee} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke="#2E2E34" horizontal={false} />
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={AXIS}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "#ffffff08" }}
                formatter={(v) => [String(v), "Tarefas"]}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
                {byAssignee.map((a) => (
                  <Cell key={a.name} fill={a.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-faint">
          Tarefas por mês de prazo
        </h3>
        {byMonth.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-faint">Nenhuma tarefa com prazo.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMonth} margin={{ left: -18, right: 8 }}>
              <CartesianGrid stroke="#2E2E34" vertical={false} />
              <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "#ffffff08" }}
                formatter={(v) => [String(v), "Tarefas"]}
              />
              <Bar dataKey="count" fill="#CE2B34" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
