import { useState, useEffect, useRef, useCallback } from 'react';
import { getWsUrl } from '../api/parking';

export function useParkingSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const isSendingRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsUrl());
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        isSendingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
        isSendingRef.current = false;
      };

      ws.onerror = (e) => {
        console.error("WebSocket Error:", e);
        setError("Connection error");
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        isSendingRef.current = false;
      };

      socketRef.current = ws;
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    isSendingRef.current = false;
  }, []);

  const setDrawBoxes = useCallback((drawBoxes) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ draw_boxes: drawBoxes }));
    }
  }, []);

  const getIsSending = useCallback(() => isSendingRef.current, []);
  const setIsSending = useCallback((val) => { isSendingRef.current = val; }, []);

  const sendFrame = useCallback((blob) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(blob);
    }
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendFrame,
    setDrawBoxes,
    isConnected,
    data,
    error,
    getIsSending,
    setIsSending
  };
}
