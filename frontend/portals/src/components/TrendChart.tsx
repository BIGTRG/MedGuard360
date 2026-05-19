'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export interface TrendPoint { day: string; value: number }

export function TrendChart({ data, label, color = '#2168e3' }: { data: TrendPoint[]; label: string; color?: string }): React.ReactElement {
  return (
    <div className="card card-body">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{label}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#gradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
