import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      CAIRO_FIX_TESTS: string;
    }
  }
}

const isFixMode = process.env.CAIRO_FIX_TESTS === "1";

export const snap = isFixMode ? fix : read;

async function read(key: string) {
  const snapshotPath = getSnapshotPath(key);
  return await fs.readFile(snapshotPath, "utf8");
}

async function fix(key: string, text: string) {
  const snapshotPath = getSnapshotPath(key);
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fs.writeFile(snapshotPath, text, "utf8");
  return text;
}

function getSnapshotPath(key: string) {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 10);
  return path.join(__filename, "..", "..", "..", "test", "snapshots", `${hash}.txt`);
}
