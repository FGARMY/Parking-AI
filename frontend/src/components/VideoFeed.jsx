import { Camera, Video } from 'lucide-react';
import Skeleton from './Skeleton';

export default function VideoFeed({ videoRef, isLive, outputImage, isLoading }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center bg-black/40">
      
      {isLoading && (
        <div className="absolute inset-0 z-10 p-4">
          <Skeleton className="w-full h-full rounded-xl opacity-30" />
        </div>
      )}

      {/* Hidden video element used for webcam capture */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-cover ${(!outputImage && isLive) ? 'block' : 'opacity-0 absolute -z-10 pointer-events-none'}`}
      />

      {/* Display processed image from AI server */}
      {outputImage && (
        <img 
          src={outputImage} 
          alt="AI Output" 
          className="w-full h-full object-cover block"
        />
      )}

      {/* Badges */}
      {(isLive || outputImage) && (
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          {isLive && (
            <div className="px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider font-semibold bg-red-500/20 text-red-400 border border-red-500/30 backdrop-blur-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
              REC
            </div>
          )}
          <div className="px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider bg-black/50 text-slate-300 border border-white/10 backdrop-blur-md">
            {outputImage ? "AI OVERLAY" : "RAW FEED"}
          </div>
        </div>
      )}

      {/* Idle State */}
      {!isLive && !outputImage && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-0">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4 border border-white/5">
            <Camera className="w-8 h-8 opacity-40" />
          </div>
          <p className="font-medium text-sm text-slate-400">Camera Inactive</p>
          <p className="text-xs text-slate-500 font-mono mt-2">Start camera or upload an image</p>
        </div>
      )}
    </div>
  );
}
