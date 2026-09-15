import { execFileSync } from "node:child_process";

function git(...args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "uncommitted";
  }
}

const commit = git("rev-parse", "--short=12", "HEAD");
const dirty = git("status", "--porcelain") ? "-dirty" : "";
const buildId = `${commit}${dirty}`;

console.log(buildId);

