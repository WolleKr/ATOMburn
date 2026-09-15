import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const GATE_B_CONFIRMATION = "BEWEGUNGSTEST FREIGEBEN";

export function classifyVisualConfirmation(answer) {
  const normalized = answer.trim().toLowerCase();
  if (normalized === "j" || normalized === "ja") return "passed";
  if (normalized === "n" || normalized === "nein") return "failed";
  return "not-confirmed";
}

export async function runAfterGateBApproval(confirmation, runMotion) {
  if (confirmation.trim() !== GATE_B_CONFIRMATION) {
    throw new Error("Gate B was not confirmed exactly; no hardware process was started.");
  }
  return runMotion();
}

async function runSquare40() {
  const scriptPath = fileURLToPath(new URL("./hardware-motion-test.mjs", import.meta.url));
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, "square40-home"], {
      cwd: path.dirname(path.dirname(scriptPath)),
      env: { ...process.env, ATOMBURN_GATE_B_APPROVAL: "approved-by-interactive-wrapper" },
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { const text = chunk.toString(); stdout += text; process.stdout.write(text); });
    child.stderr.on("data", (chunk) => { const text = chunk.toString(); stderr += text; process.stderr.write(text); });
    child.once("error", (error) => resolve({ exitCode: 1, stdout, stderr: `${stderr}${error.message}\n` }));
    child.once("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
  });
}

async function saveReport(report) {
  const projectRoot = fileURLToPath(new URL("../", import.meta.url));
  const reportDirectory = path.join(projectRoot, "artifacts", "hardware-acceptance");
  await mkdir(reportDirectory, { recursive: true });
  const stamp = report.startedAt.replaceAll(":", "-").replaceAll(".", "-");
  const reportPath = path.join(reportDirectory, `${stamp}-square40.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

async function main() {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const startedAt = new Date().toISOString();
  console.log("\nATOMburn – wiederholbarer visueller Bewegungstest (Gate B)");
  console.log("Ablauf: M5, 40 x 40 mm Quadrat bei 300 mm/min; keine Laseremission.");
  console.log("Ziel: LaserCam 192.168.178.71:23, ATOMSTACK X30 Pro.");
  console.log("Der Test startet nur, wenn du am Laser bist, die gesamte Flaeche frei ist,");
  console.log("der physische Not-Aus erreichbar ist und keine andere App GRBL steuert.");
  console.log("Das Livebild kann parallel in ATOMburn manuell gestartet werden; dabei in der App");
  console.log("nur die Kamera starten und keine zweite reale GRBL-Verbindung oeffnen.");
  console.log("Das Livebild ersetzt nicht deine Aufsicht.\n");

  const confirmation = await terminal.question(`Zum Start exakt '${GATE_B_CONFIRMATION}' eingeben: `);
  let motion;
  try {
    motion = await runAfterGateBApproval(confirmation, runSquare40);
  } catch (error) {
    console.error(`\nABGEBROCHEN: ${error instanceof Error ? error.message : String(error)}`);
    terminal.close();
    process.exitCode = 2;
    return;
  }

  let visualResult = "not-confirmed";
  if (motion.exitCode === 0) {
    const answer = await terminal.question("\nVisuell bestaetigt: geschlossenes 40-x-40-mm-Quadrat, richtige Richtungen, kein Laser? [J/N]: ");
    visualResult = classifyVisualConfirmation(answer);
  }
  terminal.close();

  const report = {
    schemaVersion: 1,
    testId: "H-VISUAL-SQUARE40-01",
    startedAt,
    finishedAt: new Date().toISOString(),
    target: { connection: "LaserCam TCP", host: "192.168.178.71", port: 23, machine: "ATOMSTACK X30 Pro" },
    protocol: { emission: false, homing: true, shape: "closed-square", widthMm: 40, heightMm: 40, feedMmPerMin: 300 },
    automatedResult: motion.exitCode === 0 ? "passed" : "failed",
    visualResult,
    cameraObservation: "optional-live-view-in-app; never an automatic safety verdict",
    stdout: motion.stdout,
    stderr: motion.stderr,
  };
  const reportPath = await saveReport(report);
  console.log(`\nTestbericht: ${reportPath}`);

  if (motion.exitCode !== 0) {
    console.error("ERGEBNIS: Technischer Test fehlgeschlagen. Keine automatische Wiederholung.");
    process.exitCode = 1;
  } else if (visualResult !== "passed") {
    console.error("ERGEBNIS: Nicht visuell abgenommen. Der Lauf gilt nicht als bestanden.");
    process.exitCode = 3;
  } else {
    console.log("ERGEBNIS: Technischer Ablauf und visuelle Abnahme bestanden.");
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
