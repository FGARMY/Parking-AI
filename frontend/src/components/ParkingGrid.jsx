import Skeleton from './Skeleton';
import { Car, CheckCircle2 } from 'lucide-react';

export default function ParkingGrid({ detections, total, isLoading }) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-medium text-white mb-4">Parking Slot Grid</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!detections || detections.length === 0) {
    return null;
  }

  // Define what classes mean occupied vs available
  const OCCUPIED_CLASSES = ["occupied", "car", "vehicle"];
  const AVAILABLE_CLASSES = ["empty", "available", "free", "space"];

  // Sort detections roughly by y then x for a pseudo-grid order
  const sortedDetections = [...detections].sort((a, b) => {
    const [ax1, ay1] = a.bbox;
    const [bx1, by1] = b.bbox;
    if (Math.abs(ay1 - by1) > 50) return ay1 - by1; // Different row
    return ax1 - bx1; // Same row
  });

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Parking Slot Grid</h3>
        <span className="text-xs font-mono text-slate-400">{sortedDetections.length} slots detected</span>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {sortedDetections.map((det, i) => {
          const isOccupied = OCCUPIED_CLASSES.includes(det.label.toLowerCase());
          const isAvailable = AVAILABLE_CLASSES.includes(det.label.toLowerCase());
          
          let color = 'bg-slate-800/50 border-slate-700 text-slate-400';
          let bgGlow = '';
          
          if (isOccupied) {
            color = 'bg-red-500/10 border-red-500/30 text-red-400';
            bgGlow = 'hover:bg-red-500/20 shadow-[inset_0_0_15px_rgba(239,68,68,0.05)]';
          } else if (isAvailable) {
            color = 'bg-green-500/10 border-green-500/30 text-green-400';
            bgGlow = 'hover:bg-green-500/20 shadow-[inset_0_0_15px_rgba(34,197,94,0.05)]';
          } else {
            // Unknown but treat as occupied
            color = 'bg-orange-500/10 border-orange-500/30 text-orange-400';
            bgGlow = 'hover:bg-orange-500/20 shadow-[inset_0_0_15px_rgba(249,115,22,0.05)]';
          }

          return (
            <div 
              key={i}
              className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-2 transition-colors duration-300 ${color} ${bgGlow}`}
            >
              <div className="mb-2">
                {isOccupied ? <Car className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6 opacity-80" />}
              </div>
              <div className="text-[10px] font-mono font-medium tracking-wider text-center">
                SLOT {i + 1}
              </div>
              <div className="text-[8px] font-mono opacity-60 mt-1">
                {Math.round(det.confidence * 100)}% CONF
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
