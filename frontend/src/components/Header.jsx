import { Clock, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';

export default function Header({ status }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-b border-[rgba(255,255,255,0.08)]">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gradient mb-1">
          Real-Time Smart Parking Detection
        </h1>
        <p className="text-sm text-slate-400 font-mono">
          Powered by YOLOv8 Computer Vision
        </p>
      </div>

      <div className="flex items-center gap-4">
        <StatusBadge status={status} />
        
        <div className="glass-card px-4 py-2 rounded-full flex items-center gap-2 border-[rgba(255,255,255,0.05)]">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-mono text-slate-300">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
      </div>
    </header>
  );
}
