import { useState, useEffect, useRef } from "react";

export type WSEvent = {
  type: string;
  payload: any;
};

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    let reconnectTimer: number;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => setIsConnected(true);
        
        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimer = window.setTimeout(connect, 3000);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastEvent(data);
          } catch (e) {
            console.error("Failed to parse WS message", e);
          }
        };

        wsRef.current = ws;
      } catch (e) {
        console.error("WS connection failed", e);
        reconnectTimer = window.setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  return { isConnected, lastEvent, sendMessage };
}
