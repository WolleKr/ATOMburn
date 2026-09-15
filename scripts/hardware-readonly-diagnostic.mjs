import { Socket } from "node:net";

const [host, portText, mode = "full"] = process.argv.slice(2);
const port = Number(portText);
if (host !== "192.168.178.71" || ![23, 8080].includes(port)) {
  throw new Error("Hardware diagnostic is locked to the approved LaserCam host and ports.");
}
if (!new Set(["full", "status-line"]).has(mode)) throw new Error("Unsupported safe diagnostic mode.");

const commands = mode === "status-line" ? [Buffer.from("?\n")] : [Buffer.from("$I\n"), Buffer.from("$$\n"), Buffer.from("$G\n"), Buffer.from("?")];
const labels = mode === "status-line" ? ["? + TCP line ending"] : ["$I", "$$", "$G", "?"];
const socket = new Socket();
socket.setNoDelay(true);
socket.setKeepAlive(true, 5_000);
socket.setTimeout(4_000);

let transcript = "";
socket.on("data", (data) => { transcript += data.toString("utf8"); });
socket.on("timeout", () => socket.destroy(new Error("TCP idle timeout")));

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("TCP connect timeout")), 3_000);
  socket.once("error", reject);
  socket.connect(port, host, () => { clearTimeout(timer); socket.removeListener("error", reject); resolve(); });
});

console.log(`CONNECTED ${host}:${port}`);
await wait(500);
for (let index = 0; index < commands.length; index += 1) {
  console.log(`TX ${labels[index]}`);
  await new Promise((resolve, reject) => socket.write(commands[index], (error) => error ? reject(error) : resolve()));
  await wait(labels[index] === "$$" ? 1_200 : 700);
}

await new Promise((resolve) => { socket.once("close", resolve); socket.end(); setTimeout(() => { socket.destroy(); resolve(); }, 500); });
console.log("DISCONNECTED");
console.log("--- RX BEGIN ---");
console.log(transcript.replaceAll("\0", ""));
console.log("--- RX END ---");

function wait(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
