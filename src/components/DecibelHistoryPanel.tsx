import React, { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Download, FileText, History, RefreshCw, Loader2, CalendarRange } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { NoiseChart } from './NoiseChart';
import { NoiseReading, HospitalUnit } from '../types';
import { cn } from '../lib/utils';

export type DecibelHistoryRange = '1h' | '6h' | '24h' | '7d' | '30d';

const RANGE_OPTIONS: { id: DecibelHistoryRange; label: string; ms: number }[] = [
  { id: '1h', label: '1h', ms: 60 * 60 * 1000 },
  { id: '6h', label: '6h', ms: 6 * 60 * 60 * 1000 },
  { id: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
];

export function decibelRangeMs(r: DecibelHistoryRange): number {
  return RANGE_OPTIONS.find((o) => o.id === r)!.ms;
}

/** Presets use a rolling window ending at `now`. Custom uses fixed start/end in local time. */
export function getDecibelHistoryBounds(
  mode: 'preset' | 'custom',
  preset: DecibelHistoryRange,
  customFrom: number,
  customTo: number,
): { from: number; to: number } {
  if (mode === 'custom') {
    const a = customFrom;
    const b = customTo;
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  }
  const t = Date.now();
  return { from: t - decibelRangeMs(preset), to: t };
}

export function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(s: string): number {
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

function formatTimeForSpan(from: number, to: number) {
  const span = to - from;
  if (span > 2 * 24 * 60 * 60 * 1000) {
    return (ts: number) => format(ts, 'MMM d, HH:mm');
  }
  if (span > 6 * 60 * 60 * 1000) {
    return (ts: number) => format(ts, 'MMM d HH:mm');
  }
  return (ts: number) => format(ts, 'HH:mm:ss');
}

function buildCsvRows(rows: NoiseReading[], unitName: string): string {
  const header = 'timestamp_utc,local_time,unit,decibels_db';
  const lines = rows.map((r) => {
    const d = new Date(r.timestamp);
    return `${d.toISOString()},${format(d, 'yyyy-MM-dd HH:mm:ss')},${unitName.replace(/"/g, '""')},${r.decibels}`;
  });
  return [header, ...lines].join('\n');
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DecibelHistoryPanel(props: {
  units: HospitalUnit[];
  selectedUnitId: string;
  onSelectUnit: (id: string) => void;
  timeMode: 'preset' | 'custom';
  onTimeModeChange: (m: 'preset' | 'custom') => void;
  range: DecibelHistoryRange;
  onRangeChange: (r: DecibelHistoryRange) => void;
  customFrom: number;
  customTo: number;
  onCustomFromChange: (ms: number) => void;
  onCustomToChange: (ms: number) => void;
  from: number;
  to: number;
  rows: NoiseReading[];
  loading: boolean;
  isLive: boolean;
  onRefresh: () => void;
}) {
  const {
    units,
    selectedUnitId,
    onSelectUnit,
    timeMode,
    onTimeModeChange,
    range,
    onRangeChange,
    customFrom,
    customTo,
    onCustomFromChange,
    onCustomToChange,
    from,
    to,
    rows,
    loading,
    isLive,
    onRefresh,
  } = props;

  const unit = units.find((u) => u.id === selectedUnitId) ?? units[0];
  const rangeSummary = useMemo(() => {
    if (timeMode === 'custom') {
      return `Custom · ${format(from, 'MMM d, yyyy HH:mm')} → ${format(to, 'MMM d, yyyy HH:mm')}`;
    }
    const label = RANGE_OPTIONS.find((o) => o.id === range)?.label ?? range;
    return `Preset ${label} · through ${format(to, 'MMM d, HH:mm')}`;
  }, [timeMode, from, to, range]);
  const formatX = useMemo(() => formatTimeForSpan(from, to), [from, to]);

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const dbs = rows.map((r) => r.decibels);
    const min = Math.min(...dbs);
    const max = Math.max(...dbs);
    const avg = dbs.reduce((a, b) => a + b, 0) / dbs.length;
    return { min, max, avg, n: rows.length };
  }, [rows]);

  const downloadCsv = useCallback(() => {
    if (!unit || rows.length === 0) return;
    const csv = buildCsvRows(rows, unit.name);
    const safe = unit.name.replace(/[^\w\-]+/g, '_').slice(0, 40);
    downloadTextFile(
      `decibel_history_${safe}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  }, [unit, rows]);

  const downloadPdf = useCallback(() => {
    if (!unit) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    let y = margin;

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Decibel monitor history', margin, y);
    y += 22;
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Unit: ${unit.name}`, margin, y);
    y += 14;
    doc.text(
      `Period: ${format(from, 'yyyy-MM-dd HH:mm')} → ${format(to, 'yyyy-MM-dd HH:mm')}${timeMode === 'custom' ? ' (custom)' : ` (${range})`}`,
      margin,
      y,
    );
    y += 14;
    doc.text(
      `Samples: ${rows.length}${
        !isLive && timeMode === 'preset' && range !== '1h' && range !== '6h'
          ? ' (demo: in-browser buffer may cap points)'
          : ''
      }`,
      margin,
      y,
    );
    y += 20;

    if (stats) {
      doc.setTextColor(30, 41, 59);
      doc.text(`Min ${stats.min} dB · Max ${stats.max} dB · Avg ${stats.avg.toFixed(1)} dB · Target ${unit.targetDecibel} dB`, margin, y);
      y += 24;
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const colW = [130, 70, 50];
    const maxRows = 40;
    const slice = rows.slice(0, maxRows);
    doc.text('Local time', margin, y);
    doc.text('dB', margin + colW[0], y);
    y += 10;
    doc.setTextColor(51, 65, 85);
    for (const r of slice) {
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.text(format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm:ss'), margin, y);
      doc.text(String(r.decibels), margin + colW[0], y);
      y += 12;
    }
    if (rows.length > maxRows) {
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`… and ${rows.length - maxRows} more rows (export CSV for full data).`, margin, y);
    }

    const safe = unit.name.replace(/[^\w\-]+/g, '_').slice(0, 40);
    doc.save(`decibel_history_${safe}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
  }, [unit, from, to, range, rows, stats, isLive, timeMode]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Decibel history</h2>
          </div>
          <p className="text-slate-500 font-medium">
            Review stored readings for the selected range. Export to CSV or PDF for reports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={rows.length === 0}
            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!unit}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-500 flex items-center gap-2 disabled:opacity-40"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 shadow-sm gap-1">
          {units.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelectUnit(u.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
                selectedUnitId === u.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {u.name}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 w-full lg:max-w-2xl lg:ml-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Window</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onTimeModeChange('preset')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  timeMode === 'preset' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => onTimeModeChange('custom')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                  timeMode === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Custom
              </button>
            </div>
          </div>
          {timeMode === 'preset' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-full sm:w-auto">
                Quick
              </span>
              <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-0.5">
                {RANGE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onTimeModeChange('preset');
                      onRangeChange(o.id);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      range === o.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
              <label className="flex flex-col gap-1.5 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start</span>
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(customFrom)}
                  onChange={(e) => onCustomFromChange(fromDatetimeLocalValue(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End</span>
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(customTo)}
                  onChange={(e) => onCustomToChange(fromDatetimeLocalValue(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </label>
            </div>
          )}
          <p className="text-[10px] text-slate-400 font-medium">{rangeSummary}</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Samples', value: String(stats.n) },
            { label: 'Min', value: `${stats.min} dB` },
            { label: 'Max', value: `${stats.max} dB` },
            { label: 'Average', value: `${stats.avg.toFixed(1)} dB` },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                {s.label}
              </p>
              <p className="text-lg font-black text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {!isLive && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          Demo mode keeps a rolling in-browser buffer (about the last 100 points). Long ranges may show only
          recent session data. Live units use full server history.
        </p>
      )}

      <div className="relative min-h-[320px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}
        {rows.length === 0 && !loading ? (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm font-medium">
            No readings in this range yet.
          </div>
        ) : (
          <NoiseChart
            readings={rows}
            targetDecibel={unit?.targetDecibel ?? 40}
            title="Decibel level (selected period)"
            formatTimeLabel={formatX}
          />
        )}
      </div>
    </div>
  );
}
