import { app } from "electron";
import { SerialPort } from "serialport";

const timeout = setTimeout(() => { console.error("Electron SerialPort smoke timed out"); app.exit(1); }, 10_000);
try {
  const ports = await SerialPort.list();
  console.log(`Electron SerialPort smoke ready (${ports.length} port(s) visible)`);
  clearTimeout(timeout); app.exit(0);
} catch (error) {
  console.error("Electron SerialPort smoke failed", error instanceof Error ? error.message : error);
  clearTimeout(timeout); app.exit(1);
}
