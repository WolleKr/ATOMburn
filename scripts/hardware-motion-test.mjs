import { Socket } from "node:net";

if (process.env.ATOMBURN_GATE_B_APPROVAL !== "approved-by-interactive-wrapper") {
  throw new Error("Direct hardware motion is locked. Use ATOMburn-Bewegungstest.cmd for a per-run Gate B confirmation.");
}

const mode = process.argv[2];
if (!new Set(["move", "frame", "square40", "square40-home", "control", "control-resume", "recover", "loss"]).has(mode)) throw new Error("Use one approved hardware-test mode.");
const host = "192.168.178.71";
const port = 23;
const allowedLines = new Set(["$H", "M5", "G91 G21", "G1 X5 F100", "$J=G91 G21 X1 F300", "$J=G91 G21 Y1 F300", "$J=G91 G21 X-1 F300", "$J=G91 G21 Y-1 F300", "$J=G91 G21 X10 F300", "$J=G91 G21 Y10 F300", "$J=G91 G21 X-10 F300", "$J=G91 G21 Y-10 F300", "$J=G91 G21 X40 F300", "$J=G91 G21 Y40 F300", "$J=G91 G21 X-40 F300", "$J=G91 G21 Y-40 F300", "$J=G91 G21 X5 F100", "$J=G91 G21 X3 F100"]);

let socket;
let lines = [];
let partial = "";
let transcript = [];

async function connect() {
  socket = new Socket(); lines = []; partial = "";
  socket.setNoDelay(true); socket.setTimeout(10_000);
  socket.on("data", (data) => {
    partial += data.toString("utf8").replaceAll("\0", "");
    const parts = partial.split(/\r?\n/); partial = parts.pop() ?? "";
    for (const line of parts.map((value) => value.trim()).filter(Boolean)) { lines.push(line); transcript.push(`< ${line}`); }
  });
  socket.on("timeout", () => socket.destroy(new Error("TCP idle timeout")));
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("TCP connect timeout")), 3_000); socket.once("error", reject); socket.connect(port, host, () => { clearTimeout(timer); socket.removeListener("error", reject); resolve(); }); });
  transcript.push(`CONNECTED ${host}:${port}`); await wait(400);
}

async function disconnect() { if (!socket || socket.destroyed) return; await new Promise((resolve) => { socket.once("close", resolve); socket.end(); setTimeout(() => { socket.destroy(); resolve(); }, 500); }); transcript.push("DISCONNECTED"); }
async function waitAfter(start, predicate, timeoutMs, label) { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { const found = lines.slice(start).find(predicate); if (found) return found; if (socket.destroyed) throw new Error(`Connection lost while waiting for ${label}.`); await wait(25); } throw new Error(`Timeout waiting for ${label}.`); }
async function sendLine(line, timeoutMs = 5_000) { if (!allowedLines.has(line)) throw new Error(`Blocked non-approved line: ${line}`); const start = lines.length; transcript.push(`> ${line}`); await write(Buffer.from(`${line}\n`)); const result = await waitAfter(start, (value) => value === "ok" || /^error:|^ALARM:|^Grbl\s/i.test(value), timeoutMs, `${line} acknowledgement`); if (result !== "ok") throw new Error(`Controller rejected ${line}: ${result}`); }
async function query() { const start = lines.length; transcript.push("> ?"); await write(Buffer.from("?\n")); const status = await waitAfter(start, (value) => value.startsWith("<") && value.endsWith(">"), 3_000, "status"); await waitAfter(start, (value) => value === "ok", 3_000, "status line acknowledgement"); return status; }
async function queryWithoutAck() { const start = lines.length; transcript.push("> ? (no ack required)"); await write(Buffer.from("?\n")); return waitAfter(start, (value) => value.startsWith("<") && value.endsWith(">"), 3_000, "status"); }
async function waitIdle(timeoutMs = 20_000) { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { const status = await query(); if (status.startsWith("<Idle|")) return status; if (/^<(Alarm|Door)/.test(status)) throw new Error(`Unsafe controller state: ${status}`); await wait(100); } throw new Error("Motion did not return to Idle."); }
async function jog(line) { await sendLine("M5"); await sendLine(line); return waitIdle(); }
function isHomed(status) { return /[WM]Pos:(?:0\.000|1\.000),(?:0\.000|1\.000)/.test(status); }
async function home() { await sendLine("M5"); await sendLine("$H", 60_000); const status = await waitIdle(10_000); if (!isHomed(status)) throw new Error(`Home did not report the confirmed 1 mm pull-off: ${status}`); return status; }
async function write(data) { await new Promise((resolve, reject) => socket.write(data, (error) => error ? reject(error) : resolve())); }
async function realtime(byte, label) { transcript.push(`> ${label}`); await write(Buffer.from([byte, 0x0a])); }
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  await connect(); const initial = mode === "recover" ? await queryWithoutAck() : await query(); if (mode !== "recover" && !initial.startsWith("<Idle|") && !initial.startsWith("<Alarm|")) throw new Error(`Unexpected initial state: ${initial}`);
  if (mode === "move") {
    transcript.push(`HOME ${await home()}`);
    for (const line of ["$J=G91 G21 X1 F300", "$J=G91 G21 Y1 F300", "$J=G91 G21 X-1 F300", "$J=G91 G21 Y-1 F300"]) transcript.push(`JOG-IDLE ${await jog(line)}`);
  } else if (mode === "frame") {
    if (!isHomed(initial)) transcript.push(`HOME ${await home()}`);
    for (const line of ["$J=G91 G21 X10 F300", "$J=G91 G21 Y10 F300", "$J=G91 G21 X-10 F300", "$J=G91 G21 Y-10 F300"]) transcript.push(`FRAME-IDLE ${await jog(line)}`);
  } else if (mode === "square40" || mode === "square40-home") {
    const squareStart = mode === "square40-home" ? await home() : initial;
    if (mode === "square40-home") transcript.push(`HOME ${squareStart}`);
    const position = /[WM]Pos:([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/.exec(squareStart);
    if (!position) throw new Error(`No confirmed XY position: ${squareStart}`);
    const x = Number(position[1]); const y = Number(position[2]);
    if (x < 0 || y < 0 || x + 40 > 400 || y + 40 > 400) throw new Error(`40 mm square exceeds workspace from ${x},${y}.`);
    for (const line of ["$J=G91 G21 X40 F300", "$J=G91 G21 Y40 F300", "$J=G91 G21 X-40 F300", "$J=G91 G21 Y-40 F300"]) transcript.push(`SQUARE40-IDLE ${await jog(line)}`);
  } else if (mode === "control") {
    if (!isHomed(initial)) transcript.push(`HOME ${await home()}`);
    await sendLine("M5"); await sendLine("$J=G91 G21 X5 F100"); await wait(500);
    await realtime(0x21, "HOLD (!)"); await wait(250); const held = await query(); if (!held.startsWith("<Hold") && !held.startsWith("<Idle")) throw new Error(`Hold not confirmed: ${held}`); transcript.push(`HOLD-STATE ${held}`);
    if (held.startsWith("<Hold")) { await realtime(0x7e, "RESUME (~)"); await wait(350); transcript.push(`RESUME-STATE ${await query()}`); }
    await realtime(0x21, "STOP-HOLD (!)"); await wait(150); await realtime(0x18, "STOP-RESET (CTRL-X)"); await waitAfter(lines.length - 1, (value) => /^Grbl\s/i.test(value), 3_000, "controller reset").catch(() => undefined); await disconnect();
    await wait(500); await connect(); transcript.push(`POST-STOP ${await query()}`); transcript.push(`REHOME ${await home()}`);
  } else if (mode === "control-resume") {
    if (!isHomed(initial)) transcript.push(`HOME ${await home()}`);
    await sendLine("M5"); await sendLine("G91 G21"); await sendLine("G1 X5 F100"); await wait(500);
    await realtime(0x21, "HOLD (!)"); await wait(250); const held = await queryWithoutAck(); if (!held.startsWith("<Hold")) throw new Error(`Hold not confirmed for G1 stream: ${held}`); transcript.push(`HOLD-STATE ${held}`);
    await realtime(0x7e, "RESUME (~)"); await wait(350); const resumed = await queryWithoutAck(); if (!resumed.startsWith("<Run") && !resumed.startsWith("<Idle")) throw new Error(`Resume not confirmed: ${resumed}`); transcript.push(`RESUME-STATE ${resumed}`);
    if (resumed.startsWith("<Run")) { await realtime(0x21, "STOP-HOLD (!)"); await wait(150); await realtime(0x18, "STOP-RESET (CTRL-X)"); await wait(500); }
    await disconnect(); await wait(500); await connect(); transcript.push(`POST-STOP ${await query()}`); transcript.push(`REHOME ${await home()}`);
  } else if (mode === "recover") {
    transcript.push(`RECOVERY-STATE ${initial}`);
    if (initial.startsWith("<Hold") || initial.startsWith("<Run") || initial.startsWith("<Jog")) { await realtime(0x18, "RECOVERY-RESET (CTRL-X)"); await wait(500); }
    await disconnect(); await wait(500); await connect(); transcript.push(`POST-RECOVERY ${await query()}`); transcript.push(`REHOME ${await home()}`);
  } else {
    if (!isHomed(initial)) transcript.push(`HOME ${await home()}`);
    await sendLine("M5"); await sendLine("$J=G91 G21 X3 F100"); await wait(400); transcript.push("INTENTIONAL TCP LOSS"); socket.destroy(); await wait(2_500);
    await connect(); transcript.push(`POST-LOSS ${await query()}`); transcript.push(`REHOME ${await home()}`);
  }
  await disconnect(); console.log(transcript.join("\n")); console.log(`RESULT ${mode.toUpperCase()} PASS`);
} catch (error) {
  await disconnect().catch(() => undefined); console.error(transcript.join("\n")); throw error;
}
