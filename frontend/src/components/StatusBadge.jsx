export default function StatusBadge({ status }) {
  // status enum: 'idle', 'running', 'processing', 'error'
  
  const getStyles = () => {
    switch (status) {
      case 'running':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          text: 'text-green-400',
          dot: 'bg-green-400 animate-pulse-slow'
        };
      case 'processing':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          dot: 'bg-blue-400 animate-pulse-slow'
        };
      case 'error':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          dot: 'bg-red-500'
        };
      default:
        return {
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          dot: 'bg-slate-500'
        };
    }
  };

  const s = getStyles();

  return (
    <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 border ${s.bg} ${s.border}`}>
      <div className={`w-2 h-2 rounded-full ${s.dot}`} />
      <span className={`text-xs font-medium uppercase tracking-wider ${s.text}`}>
        {status}
      </span>
    </div>
  );
}
