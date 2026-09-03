import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Card } from './UI';
import { formatMoney } from '../lib/utils';

export const CHART_COLORS = ['#0b3d78', '#0d7a70', '#c9a227', '#7c5cff', '#be123c', '#2563eb'];

function ChartFrame({ title, sub, height = 240, children, empty, emptyText = 'No data yet.' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      {empty ? (
        <p className="text-sm text-gray-400 text-center" style={{ paddingTop: height / 2 - 20, paddingBottom: height / 2 - 20 }}>{emptyText}</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      )}
    </Card>
  );
}

const gridProps = { strokeDasharray: '3 3', stroke: '#eef1f5' };
const tickProps = { fontSize: 11, fill: '#64748b' };

export function TrendAreaChart({ data, dataKey, name, title, sub, color = '#0b3d78', money = false, height = 240 }) {
  return (
    <ChartFrame title={title} sub={sub} height={height} empty={!data?.length}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" tick={tickProps} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
        <YAxis tick={tickProps} axisLine={false} tickLine={false} width={money ? 60 : 32} tickFormatter={money ? (v) => formatMoney(v) : undefined} allowDecimals={!money} />
        <Tooltip formatter={money ? (v) => `${formatMoney(v)} RWF` : undefined} contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ChartFrame>
  );
}

export function TrendBarChart({ data, dataKey, name, title, sub, color = '#0b3d78', height = 240 }) {
  return (
    <ChartFrame title={title} sub={sub} height={height} empty={!data?.length}>
      <BarChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" tick={tickProps} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={tickProps} axisLine={false} tickLine={false} width={32} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[5, 5, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartFrame>
  );
}

export function HorizontalBarChart({ data, dataKey, name, title, sub, color = '#0d7a70', money = false, height, nameKey = 'name' }) {
  const h = height || Math.max(160, (data?.length || 0) * 36);
  return (
    <ChartFrame title={title} sub={sub} height={h} empty={!data?.length}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid {...gridProps} />
        <XAxis type="number" tick={tickProps} axisLine={false} tickLine={false} tickFormatter={money ? (v) => formatMoney(v) : undefined} />
        <YAxis type="category" dataKey={nameKey} width={110} tick={tickProps} axisLine={false} tickLine={false} />
        <Tooltip formatter={money ? (v) => `${formatMoney(v)} RWF` : undefined} contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[0, 5, 5, 0]} maxBarSize={22} />
      </BarChart>
    </ChartFrame>
  );
}

export function DonutChart({ data, title, sub, height = 240, colors = CHART_COLORS }) {
  const total = (data || []).reduce((s, d) => s + d.value, 0);
  return (
    <ChartFrame title={title} sub={sub} height={height} empty={!data?.length}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="white" strokeWidth={2} />)}
        </Pie>
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${v} (${total ? Math.round((v / total) * 100) : 0}%)`} contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
      </PieChart>
    </ChartFrame>
  );
}

// Funnel-style pipeline visual: stage counts with connecting arrows and conversion %.
export function PipelineFunnel({ stages, title = 'Pipeline', sub }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm text-gray-700">{title}</h2>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1].value : null;
          const conv = prev ? Math.round((s.value / Math.max(1, prev)) * 100) : null;
          return (
            <div key={s.key} className="text-center relative">
              <div className="mx-auto rounded-lg bg-gradient-to-b from-rssb-blue-light to-white border border-rssb-blue/10 py-3" style={{ opacity: 0.55 + 0.45 * (s.value / max) }}>
                <div className="font-display text-2xl font-semibold text-rssb-blue-dark">{s.value}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
              </div>
              {i < stages.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3.5 -translate-y-1/2 items-center text-gray-300 text-sm z-10">&rarr;</div>
              )}
              {conv != null && <div className="text-[10px] text-gray-400 mt-1">{conv}% conversion</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
