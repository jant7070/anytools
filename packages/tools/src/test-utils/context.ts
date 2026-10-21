import type { StoredFileRef } from "@anytools/shared";
import type { SaveFileInput, ToolInputFile } from "../define-tool.js";
import type { ExecuteToolOptions } from "../execute.js";

export interface SavedFile extends SaveFileInput {
  ref: StoredFileRef;
}

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

/** Execution options for tests: saved files are captured in memory instead of storage. */
export function createTestOptions(files: ToolInputFile[] = []) {
  const saved: SavedFile[] = [];
  const options: ExecuteToolOptions = {
    files,
    log: silentLogger,
    saveFile: async (file) => {
      const ref: StoredFileRef = {
        key: `results/${crypto.randomUUID()}`,
        filename: file.filename,
        contentType: file.contentType,
        size: file.data.length,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      };
      saved.push({ ...file, ref });
      return ref;
    },
  };
  return { options, saved };
}
