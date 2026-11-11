'use client';

import { useState } from 'react';

export type ChartSeries = { name: string; color: string; values: number[] };

/** A line chart of one or more series over the same labels. Hover or tap a day to read the exact numbers; every series is named in the legend. */
export function LineChart({ labels, series, format = (value: number) => value.toLocaleString(), title }: { labels: string[]; series: ChartSeries[]; format?: (value: number) => string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 200;
  const left = 44;
  const right = 12;
  const top = 10;
  const bottom = 24;
  const max = Math.max(1, ...series.flatMap((item) => item.values));
  const step = labels.length > 1 ? (width - left - right) / (labels.length - 1) : 0;
  const x = (index: number) => left + index * step;
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const active = hover ?? labels.length - 1;

  return (
    <figure className="adm-chart">
      <figcaption>
        <strong>{title}</strong>
        <span className="adm-legend">{series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</span>
      </figcaption>
      <p aria-live="polite" className="adm-readout">{labels[active]}: {series.map((item) => `${item.name} ${format(item.values[active] ?? 0)}`).join(' · ')}</p>
      <svg aria-label={`${title}. ${series.map((item) => `${item.name}, latest ${format(item.values.at(-1) ?? 0)}`).join('; ')}`} role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map((tick) => (
          <g key={tick}>
            <line className="adm-grid" x1={left} x2={width - right} y1={y(max * tick)} y2={y(max * tick)} />
            <text className="adm-axis" textAnchor="end" x={left - 6} y={y(max * tick) + 3}>{format(Math.round(max * tick))}</text>
          </g>
        ))}
        {series.map((item) => (
          <polyline fill="none" key={item.name} points={item.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')} stroke={item.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        ))}
        {series.map((item) => <circle cx={x(active)} cy={y(item.values[active] ?? 0)} fill={item.color} key={`${item.name}-dot`} r="4" stroke="var(--adm-surface, #101626)" strokeWidth="2" />)}
        {[0, Math.floor((labels.length - 1) / 2), labels.length - 1].map((index) => (
          <text className="adm-axis" key={index} textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'} x={x(index)} y={height - 6}>{labels[index]?.slice(5)}</text>
        ))}
        {labels.map((label, index) => (
          <rect fill="transparent" height={height - top - bottom} key={label} onBlur={() => setHover(null)} onClick={() => setHover(index)} onFocus={() => setHover(index)} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} tabIndex={0} width={Math.max(6, step)} x={x(index) - Math.max(6, step) / 2} y={top} />
        ))}
      </svg>
    </figure>
  );
}

/** Daily bars for a single measure (such as revenue). */
export function BarChart({ labels, values, color, format = (value: number) => value.toLocaleString(), title }: { labels: string[]; values: number[]; color: string; format?: (value: number) => string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 200;
  const left = 56;
  const bottom = 24;
  const top = 10;
  const max = Math.max(1, ...values);
  const slot = (width - left - 8) / Math.max(1, values.length);
  const active = hover ?? values.length - 1;
  return (
    <figure className="adm-chart">
      <figcaption><strong>{title}</strong></figcaption>
      <p aria-live="polite" className="adm-readout">{labels[active]}: <b>{format(values[active] ?? 0)}</b></p>
      <svg aria-label={`${title}. Total ${format(values.reduce((sum, value) => sum + value, 0))}`} role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map((tick) => (
          <g key={tick}>
            <line className="adm-grid" x1={left} x2={width - 8} y1={top + (1 - tick) * (height - top - bottom)} y2={top + (1 - tick) * (height - top - bottom)} />
            <text className="adm-axis" textAnchor="end" x={left - 6} y={top + (1 - tick) * (height - top - bottom) + 3}>{format(Math.round(max * tick))}</text>
          </g>
        ))}
        {values.map((value, index) => {
          const barHeight = Math.max(value > 0 ? 2 : 0, (value / max) * (height - top - bottom));
          const bx = left + index * slot + 2;
          return (
            <g key={labels[index]}>
              <rect fill="transparent" height={height - top - bottom} onBlur={() => setHover(null)} onClick={() => setHover(index)} onFocus={() => setHover(index)} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} tabIndex={0} width={slot} x={left + index * slot} y={top} />
              <rect fill={color} height={barHeight} opacity={hover === null || hover === index ? 1 : 0.55} pointerEvents="none" rx="3" width={Math.max(3, slot - 4)} x={bx} y={height - bottom - barHeight} />
            </g>
          );
        })}
        {[0, Math.floor((labels.length - 1) / 2), labels.length - 1].map((index) => (
          <text className="adm-axis" key={index} textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'} x={index === 0 ? left : index === labels.length - 1 ? width - 8 : left + (index + 0.5) * slot} y={height - 6}>{labels[index]?.slice(5)}</text>
        ))}
      </svg>
    </figure>
  );
}

/** A ranked list with a bar and a share for each row (countries, devices, browsers, sources). Labels sit on the bars, never in colour alone. */
export function BarList({ title, rows, color, empty = 'Nothing yet.' }: { title: string; rows: Array<{ label: string; people: number }>; color: string; empty?: string }) {
  const total = rows.reduce((sum, row) => sum + row.people, 0);
  const max = Math.max(1, ...rows.map((row) => row.people));
  return (
    <section aria-label={title} className="adm-barlist">
      <h3>{title}</h3>
      {rows.length === 0 ? <p className="admin-muted">{empty}</p> : rows.map((row) => (
        <div className="adm-barrow" key={row.label}>
          <span>{row.label}</span>
          <div className="adm-track"><i style={{ width: `${Math.max(3, (row.people / max) * 100)}%`, background: color }} /></div>
          <b>{row.people.toLocaleString()} <small>({total > 0 ? Math.round((row.people / total) * 100) : 0}%)</small></b>
        </div>
      ))}
    </section>
  );
}
