import { useState, useEffect, useRef } from 'react';
import { TelemetryPacket, HistoricalTelemetryPoint } from '../types/telemetry';

export function useTelemetryWs(url: string = 'ws://127.0.0.1:8000/ws/telemetry') {
  const [packet, setPacket] = useState<TelemetryPacket | null>(null);
  const [history, setHistory] = useState<HistoricalTelemetryPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'CONNECTING'>('CONNECTING');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setConnectionStatus('CONNECTING');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setConnectionStatus('CONNECTED');
        console.log('[WebSocket] Telemetry link established at 1 Hz.');
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        const t0 = performance.now();
        try {
          const data: TelemetryPacket = JSON.parse(event.data);
          setPacket(data);

          const newPoint: HistoricalTelemetryPoint = {
            time: data.timestamp,
            frame_id: data.frame_id,
            temp: data.sensors.temp,
            humidity: data.sensors.humidity,
            smoke: data.sensors.smoke,
            lpg_gas: data.sensors.lpg_gas,
            flame: data.sensors.flame,
            dT_dt: data.derivatives.dT_dt,
            dSmoke_dt: data.derivatives.dSmoke_dt,
            risk_score: data.prediction.risk_score,
          };

          setHistory((prev) => {
            const next = [...prev, newPoint];
            return next.length > 60 ? next.slice(next.length - 60) : next;
          });

          setLatencyMs(Math.round(performance.now() - t0));
        } catch (e) {
          console.error('[WebSocket] Failed to parse telemetry packet:', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnectionStatus('OFFLINE');
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isMounted) {
            setConnectionStatus('RECONNECTING');
            connect();
          }
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return { packet, history, connectionStatus, latencyMs };
}
