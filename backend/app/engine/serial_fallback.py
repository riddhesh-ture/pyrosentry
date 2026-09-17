"""
Zero-Friction Hardware Serial Adapter for VIT FF180 Smart Fire Detection System.
Safely detects and connects to an Arduino/ESP32 if plugged in.
Gracefully degrades to virtual simulation when no microcontroller is present,
preventing pyserial port-not-found exceptions.
"""

from typing import Dict, Optional
import json

class SerialFallbackAdapter:
    def __init__(self, port: Optional[str] = None, baud_rate: int = 115200):
        self.port = port
        self.baud_rate = baud_rate
        self.serial_conn = None
        self.is_connected = False
        self._init_connection()

    def _init_connection(self):
        try:
            import serial
            import serial.tools.list_ports

            available_ports = [p.device for p in serial.tools.list_ports.comports()]
            if not available_ports:
                print("[SerialAdapter] No physical COM ports detected. Running in zero-hardware virtual mode.")
                return

            target_port = self.port if self.port in available_ports else available_ports[0]
            self.serial_conn = serial.Serial(target_port, self.baud_rate, timeout=0.1)
            self.is_connected = True
            print(f"[SerialAdapter] Successfully connected to hardware on {target_port} at {self.baud_rate} baud.")
        except Exception as e:
            print(f"[SerialAdapter] Hardware connection bypassed: {e}. Defaulting to physics simulation engine.")
            self.is_connected = False
            self.serial_conn = None

    def read_packet(self) -> Optional[Dict[str, float]]:
        """
        Reads a single newline-terminated JSON packet from hardware serial if connected.
        Expected format: {"temp": 24.5, "humidity": 52.0, "smoke": 22.0, "lpg_gas": 25.0, "flame": 0.0}
        """
        if not self.is_connected or self.serial_conn is None:
            return None

        try:
            line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
            if line and line.startswith('{') and line.endswith('}'):
                data = json.loads(line)
                return {
                    "temp": float(data.get("temp", 24.0)),
                    "humidity": float(data.get("humidity", 50.0)),
                    "smoke": float(data.get("smoke", 20.0)),
                    "lpg_gas": float(data.get("lpg_gas", 25.0)),
                    "flame": float(data.get("flame", 0.0)),
                }
        except Exception as e:
            print(f"[SerialAdapter] Serial read error: {e}")
        return None
