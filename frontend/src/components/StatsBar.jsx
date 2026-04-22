import Skeleton from './Skeleton';

function StatCard({ label, value, colorClass, max, isLoading }) {
  const percentage = max > 0 && !isNaN(value) ? Math.round((value / max) * 100) : 0;
  
  return (
    <div className="glass-card rounded-xl p-5 flex-1 relative overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-colors">
      {/* Background glow */}
      <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-10 rounded-full ${colorClass}`} />
      
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest">{label}</h3>
      </div>
      
      <div className="mb-4">
        {isLoading ? (
          <Skeleton className="h-12 w-24 mb-1" />
        ) : (
          <div className="text-5xl font-serif tracking-tight text-white flex items-baseline gap-2">
            {value}
            {max > 0 && <span className="text-sm font-sans text-slate-500 font-medium">/ {max}</span>}
          </div>
        )}
      </div>

      {max > 0 && (
        <div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-500 text-right">
            {percentage}% {label.toLowerCase()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatsBar({ total, occupied, available, isLoading }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full sticky top-0 z-10 py-4 bg-bg-base/80 backdrop-blur-xl border-b md:border-none border-[rgba(255,255,255,0.05)] md:bg-transparent md:backdrop-blur-none md:py-0 md:static">
      <StatCard 
        label="Total Slots" 
        value={total} 
        colorClass="bg-blue-500" 
        isLoading={isLoading} 
      />
      <StatCard 
        label="Occupied" 
        value={occupied} 
        max={total} 
        colorClass="bg-red-500" 
        isLoading={isLoading} 
      />
      <StatCard 
        label="Available" 
        value={available} 
        max={total} 
        colorClass="bg-green-500" 
        isLoading={isLoading} 
      />
    </div>
  );
}
