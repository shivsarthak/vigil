import { useEffect, useRef, useCallback, useState } from 'react';
import type { DataPoint, Session, ProcessInfo } from '@/types';

interface WSMessage {
  type: 'datapoint' | 'error' | 'started' | 'stopped' | 'processes';
  payload: Record<string, unknown>;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  startMonitoring: (pid: number, name?: string) => void;
  stopMonitoring: (pid: number) => void;
  currentSession: Session | null;
  dataPoints: DataPoint[];
  isRecording: boolean;
  error: string | null;
  clearError: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const wsUrl = isDev
      ? 'ws://localhost:3001'
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;

          switch (message.type) {
            case 'started': {
              const payload = message.payload as unknown as { session: Session; processInfo: ProcessInfo };
              setCurrentSession(payload.session);
              setDataPoints([]);
              setIsRecording(true);
              setError(null);
              break;
            }

            case 'datapoint': {
              const datapoint = message.payload as unknown as DataPoint & { sessionId: string };
              setDataPoints(prev => [...prev, {
                timestamp: datapoint.timestamp,
                cpu: datapoint.cpu,
                memory: datapoint.memory,
                ppid: datapoint.ppid,
              }]);
              break;
            }

            case 'stopped': {
              const payload = message.payload as unknown as { session: Session };
              setCurrentSession(payload.session);
              setIsRecording(false);
              break;
            }

            case 'error': {
              const payload = message.payload as unknown as { message: string };
              setError(payload.message);
              if (payload.message === 'Process terminated') {
                setIsRecording(false);
              }
              break;
            }
          }
        } catch {
          console.error('Failed to parse WebSocket message');
        }
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const startMonitoring = useCallback((pid: number, name?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start',
        payload: { pid, name },
      }));
    }
  }, []);

  const stopMonitoring = useCallback((pid: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop',
        payload: { pid },
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isConnected,
    startMonitoring,
    stopMonitoring,
    currentSession,
    dataPoints,
    isRecording,
    error,
    clearError,
  };
}
