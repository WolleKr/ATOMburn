import type { AtomBurnBridge } from "../shared/contracts.js";

declare global {
  interface Window {
    atomBurn: AtomBurnBridge;
  }
}

export {};
