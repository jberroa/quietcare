import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format } from 'date-fns';
import { NoiseReading } from '../types';

interface NoiseChartProps {
  readings: NoiseReading[];
  targetDecibel: number;
  /** Defaults to a clock-style label (HH:mm:ss). */
  formatTimeLabel?: (timestamp: number) => string;
  title?: string;
}

export const NoiseChart: React.FC<NoiseChartProps> = ({
  readings,
  targetDecibel,
  formatTimeLabel = (ts) => format(ts, 'HH:mm:ss'),
  title = 'Live Decibel Monitor',
}) => {
  const data = readings.map((r) => ({
    ...r,
    time: formatTimeLabel(r.timestamp),
  }));

  return (
    <div className="h-[300px] w-full bg-white/50 backdrop-blur-sm rounded-2xl p-4 pb-4 border border-slate-200 shadow-sm flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h3>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-500 text-[10px] uppercase tracking-tighter">Current Level</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-slate-500 text-[10px] uppercase tracking-tighter">Target ({targetDecibel}dB)</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 28 }}>
          <defs>
            <linearGradient id="colorDb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickMargin={6}
            minTickGap={30}
            height={36}
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="decibels" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorDb)" 
            animationDuration={1000}
          />
          <Line 
            type="monotone" 
            dataKey={() => targetDecibel} 
            stroke="#f87171" 
            strokeDasharray="5 5" 
            dot={false}
            activeDot={false}
          />
        </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
