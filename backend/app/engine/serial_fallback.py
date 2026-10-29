"""
Zero-Friction Hardware Serial Adapter for PYROSENTRY AI Industrial Telemetry System.
Safely detects and connects to an Arduino/ESP32 if plugged in via USB/UART.
Provides automatic background re-scanning so that hot-plugging the ESP32 while the server
is running is detected seamlessly.
Gracefully degrades to virtual simulation when no microcontroller is present or if unplugged,
preventing pyserial port-not-found exceptions.
"""

from typing import Dict, Optional
import time
import json

class SerialFallbackAdapter:
    def __init__(self, port: Optional[str] = None, baud_rate: int = 115200):
        self.port = port
        self.baud_rate = baud_rate
        self.serial_conn = None
        self.is_connected = False
        self.active_port_name: Optional[str] = None
        self.last_packet_time = 0.0
        self.last_scan_time = 0.0
        self.scan_interval = 3.0  # Seconds between background scans when disconnected
        self._init_connection()

    def _init_connection(self):
        self.last_scan_time = time.time()
        try:
            import serial
            import serial.tools.list_ports

            available_ports = [p.device for p in serial.tools.list_ports.comports()]
            if not available_ports:
                self.is_connected = False
                self.serial_conn = None
                self.active_port_name = None
                return

            target_port = self.port if self.port in available_ports else available_ports[0]
            self.serial_conn = serial.Serial(target_port, self.baud_rate, timeout=0.1)
            self.is_connected = True
            self.active_port_name = target_port
            self.last_packet_time = time.time()
            print(f"[SerialAdapter] Successfully connected to hardware on {target_port} at {self.baud_rate} baud.")
        except Exception as e:
            self.is_connected = False
            self.serial_conn = None
            self.active_port_name = None

    def check_connection(self):
        """Attempts background reconnect if disconnected and scan interval elapsed."""
        if not self.is_connected and (time.time() - self.last_scan_time > self.scan_interval):
            self._init_connection()

    def disconnect(self):
        if self.serial_conn is not None:
            try:
                self.serial_conn.close()
            except Exception:
                pass
        self.serial_conn = None
        self.is_connected = False
        self.active_port_name = None

    @property
    def source_label(self) -> str:
        if self.is_connected and self.active_port_name:
            return f"ESP32_HARDWARE ({self.active_port_name})"
        return "VIRTUAL_CONTROLLER"

    def read_packet(self) -> Optional[Dict[str, float]]:
        """
        Reads a single newline-terminated JSON packet from hardware serial if connected.
        Expected format: {"temp": 24.5, "humidity": 52.0, "smoke": 22.0, "lpg_gas": 25.0, "flame": 0.0}
        If cable disconnected or read error occurs, cleanly transitions to fallback.
        """
        self.check_connection()
        if not self.is_connected or self.serial_conn is None:
            return None

        try:
            line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
            if line and line.startswith('{') and line.endswith('}'):
                data = json.loads(line)
                self.last_packet_time = time.time()
                return {
                    "temp": float(data.get("temp", 24.0)),
                    "humidity": float(data.get("humidity", 50.0)),
                    "smoke": float(data.get("smoke", 20.0)),
                    "lpg_gas": float(data.get("lpg_gas", 25.0)),
                    "flame": float(data.get("flame", 0.0)),
                }
        except Exception as e:
            print(f"[SerialAdapter] Hardware disconnected or read error: {e}. Reverting to simulation fallback.")
            self.disconnect()
            return None

        # Check for packet silence timeout (>3.0 seconds)
        if time.time() - self.last_packet_time > 3.0:
            return None

        return None
