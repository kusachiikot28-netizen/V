import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ElevationChartProps {
  points: [number, number][];
}

export default function ElevationChart({ points }: ElevationChartProps) {
  // Mock elevation data based on points
  const data = points.map((_, index) => ({
    distance: (index * 1.2).toFixed(1),
    elevation: 100 + Math.sin(index * 0.5) * 50 + Math.random() * 20,
  }));

  if (points.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary italic">
        Добавьте точки на карту, чтобы увидеть профиль высот
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00C853" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00C853" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
          <XAxis 
            dataKey="distance" 
            stroke="#B0B0B0" 
            fontSize={10} 
            tickFormatter={(val) => `${val} км`}
          />
          <YAxis 
            stroke="#B0B0B0" 
            fontSize={10} 
            tickFormatter={(val) => `${val} м`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #2C2C2C', borderRadius: '8px' }}
            itemStyle={{ color: '#00C853' }}
          />
          <Area 
            type="monotone" 
            dataKey="elevation" 
            stroke="#00C853" 
            fillOpacity={1} 
            fill="url(#colorElev)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
