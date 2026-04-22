import { Upload, Play, Square, Video, MonitorPlay, ToggleLeft, ToggleRight } from 'lucide-react';

export default function ControlPanel({ 
  onStartCamera, 
  onStopCamera, 
  onStartServerStream,
  onStartDetection, 
  onStopDetection,
  onUploadImage,
  hasCamera,
  isStreaming,
  isDetecting,
  drawBoxes,
  onToggleBoxes
}) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUploadImage(file);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 flex flex-col gap-6">
      
      {/* Real-time Controls */}
      <div>
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">Live Processing</h3>
        <div className="grid grid-cols-1 gap-3">
          {!hasCamera ? (
            <button onClick={onStartCamera} className="w-full btn-primary flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              <Video className="w-4 h-4" /> Start Camera
            </button>
          ) : (
            <button onClick={onStopCamera} className="w-full btn-danger flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <Square className="w-4 h-4" /> Stop Camera & Detection
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
