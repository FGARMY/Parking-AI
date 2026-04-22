import { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import VideoFeed from './components/VideoFeed';
import ControlPanel from './components/ControlPanel';
import ParkingGrid from './components/ParkingGrid';
import { useParkingSocket } from './hooks/useParkingSocket';
import { analyzeImage, getLiveStreamUrl } from './api/parking';

function App() {
  const [status, setStatus] = useState('idle'); // idle, running, processing, error
  const [total, setTotal] = useState(0);
  const [occupied, setOccupied] = useState(0);
  const [available, setAvailable] = useState(0);
  const [outputImage, setOutputImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [drawBoxes, setDrawBoxes] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const {
    connect,
    disconnect,
    sendFrame,
    setDrawBoxes: setWSDrawBoxes,
    isConnected,
    data,
    error,
    getIsSending,
    setIsSending
  } = useParkingSocket();

  // Sync WS boxes setting when drawBoxes changes and WS is connected
  useEffect(() => {
    if (isConnected) {
      setWSDrawBoxes(drawBoxes);
    }
  }, [drawBoxes, isConnected, setWSDrawBoxes]);

  // Handle WS Data Updates
  useEffect(() => {
    if (data && !data.error) {
      setTotal(data.total_slots || 0);
      setOccupied(data.occupied || 0);
      setAvailable(data.available || 0);
      if (data.image) setOutputImage(`data:image/jpeg;base64,${data.image}`);
      if (data.detections) setDetections(data.detections);
      setStatus('running');
    }
  }, [data]);

  // Handle WS Error
  useEffect(() => {
    if (error) setStatus('error');
  }, [error]);

  // Frame Capture Loop
  const loop = () => {
    if (!isConnected) return;

    const video = videoRef.current;
    if (getIsSending() || !video || !video.videoWidth) {
      animationFrameRef.current = requestAnimationFrame(loop);
      return;
    }

    setIsSending(true);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob && isConnected) {
        sendFrame(blob);
      } else {
        setIsSending(false);
      }
    }, "image/jpeg", 0.6);

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (isConnected) {
      loop();
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isConnected]); // Re-run loop when connected state changes


  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsLive(true);
      setOutputImage(null);
      setDetections([]);
      setStatus('idle');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const handleStopCamera = () => {
    disconnect();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLive(false);
    setOutputImage(null);
    setDetections([]);
    setStatus('idle');
    setTotal(0);
    setOccupied(0);
    setAvailable(0);
  };

  const handleStartServerStream = () => {
    setIsLive(false); // don't show raw camera
    setOutputImage(getLiveStreamUrl(drawBoxes));
    setStatus('running');
  };

  const handleStartDetection = () => {
    if (!isLive) return;
    setStatus('processing');
    connect();
  };

  const handleStopDetection = () => {
    disconnect();
    setStatus('idle');
    if (isLive) {
      // Revert to raw feed if camera is still on
      setOutputImage(null);
    }
  };

  const handleUploadImage = async (file) => {
    setIsLoading(true);
    setStatus('processing');
    
    // Create local object URL just to show raw image while loading if we wanted, 
    // but the backend will return the processed one quickly.
    
    try {
      const res = await analyzeImage(file, drawBoxes);
      if (res && !res.error) {
        setTotal(res.total_slots || 0);
        setOccupied(res.occupied || 0);
        setAvailable(res.available || 0);
        if (res.image) setOutputImage(`data:image/jpeg;base64,${res.image}`);
        if (res.detections) setDetections(res.detections);
        setStatus('idle');
      } else {
        setStatus('error');
      }
    } catch (e) {
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBoxes = () => {
    setDrawBoxes(prev => !prev);
    // If we are currently streaming from server, update the URL
    if (status === 'running' && outputImage && outputImage.includes('/live')) {
      setOutputImage(getLiveStreamUrl(!drawBoxes));
    }
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-6">
        
        <Header status={status} />
        
        <StatsBar 
          total={total} 
          occupied={occupied} 
          available={available} 
          isLoading={isLoading} 
        />

        <main className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          
          <div className="flex flex-col gap-6">
            <VideoFeed 
              videoRef={videoRef}
              isLive={isLive}
              outputImage={outputImage}
              isLoading={isLoading}
            />
            
            <ParkingGrid 
              detections={detections}
              total={total}
              isLoading={isLoading}
            />
          </div>

          <aside className="flex flex-col gap-6 sticky top-24">
            <ControlPanel 
              onStartCamera={handleStartCamera}
              onStopCamera={handleStopCamera}
              onStartServerStream={handleStartServerStream}
              onStartDetection={handleStartDetection}
              onStopDetection={handleStopDetection}
              onUploadImage={handleUploadImage}
              hasCamera={isLive}
              isStreaming={status === 'running' || status === 'processing'}
              isDetecting={isConnected}
              drawBoxes={drawBoxes}
              onToggleBoxes={handleToggleBoxes}
            />
            
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-2">System Info</h3>
              <div className="space-y-3 font-mono text-xs text-slate-400 mt-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Backend</span>
                  <span className="text-green-400">FastAPI</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>AI Model</span>
                  <span className="text-blue-400">YOLOv8</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span>Connection</span>
                  <span className={isConnected ? "text-green-400" : "text-slate-500"}>
                    {isConnected ? 'WebSocket' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </aside>

        </main>
      </div>
    </div>
  );
}

export default App;
