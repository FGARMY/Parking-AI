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
      
      {/* Box Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h3 className="text-sm font-medium text-white">Bounding Boxes</h3>
          <p className="text-xs text-slate-400 font-mono mt-1">Show AI detection overlay</p>
        </div>
        <button 
          onClick={onToggleBoxes}
          className="text-slate-300 hover:text-white transition-colors"
        >
          {drawBoxes ? (
            <ToggleRight className="w-10 h-10 text-blue-500" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-slate-600" />
          )}
        </button>
      </div>

      {/* Real-time Controls */}
      <div>
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">Live Processing</h3>
        <div className="grid grid-cols-2 gap-3">
          {!hasCamera ? (
            <>
              <button onClick={onStartCamera} className="col-span-2 md:col-span-1 btn-primary flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium transition-all">
                <Video className="w-4 h-4" /> Start Camera
              </button>
              <button onClick={onStartServerStream} className="col-span-2 md:col-span-1 btn-secondary flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all border border-white/10">
                <MonitorPlay className="w-4 h-4" /> Server Stream
              </button>
            </>
          ) : (
            <button onClick={onStopCamera} className="col-span-2 btn-danger flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-500/30 py-2.5 rounded-lg text-sm font-medium transition-all">
              <Square className="w-4 h-4" /> Stop Camera
            </button>
          )}

          {hasCamera && (
            <div className="col-span-2 pt-2">
              {!isDetecting ? (
                <button onClick={onStartDetection} className="w-full btn-primary flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <Play className="w-4 h-4" /> Start AI Detection
                </button>
              ) : (
                <button onClick={onStopDetection} className="w-full btn-danger flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  <Square className="w-4 h-4" /> Stop AI Detection
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Image */}
      <div>
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">Static Analysis</h3>
        <label className="cursor-pointer group block">
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center group-hover:border-blue-500/50 group-hover:bg-blue-500/5 transition-all">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-200">Upload Image</p>
            <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP</p>
          </div>
        </label>
      </div>

    </div>
  );
}
