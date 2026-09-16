/**
 * Sandboxed content pack filesystem storage manager.
 * Supports React Native (Expo FileSystem) and Node.js test environments.
 */

// Dynamically check environment
const isNode = typeof process !== "undefined" && Boolean(process.versions?.node);

function getNodeModule(name: string): any {
  try {
    const g = globalThis as any;
    if (typeof g.process !== "undefined" && g.process.versions?.node) {
      const req = g.module?.require ? g.module.require.bind(g.module) : g.require;
      return req ? req(name) : null;
    }
  } catch {
    return null;
  }
  return null;
}

let expoFs: any = null;
try {
  expoFs = require("expo-file-system/legacy");
} catch {
  // safe fallback
}

const nodeFs: any = getNodeModule("fs");
const nodePath: any = getNodeModule("path");

// In-memory fallback if neither filesystem is available (e.g. mock test environment)
const inMemoryStore = new Map<string, string>();

/**
 * Base directory for installed content packs
 */
function getBaseDocumentDir(): string {
  if (expoFs?.documentDirectory) {
    return expoFs.documentDirectory;
  }
  if (isNode) {
    // In Node test runner, use sandbox scratch directory or tmp
    return "/Users/macbook/.gemini/antigravity/scratch/koki/.content_storage/";
  }
  return "file:///tmp/koki-content/";
}

function getBaseCacheDir(): string {
  if (expoFs?.cacheDirectory) {
    return expoFs.cacheDirectory;
  }
  return getBaseDocumentDir() + "cache/";
}

export const ContentStorage = {
  getContentDirectory(): string {
    const base = getBaseDocumentDir();
    return base.endsWith("/") ? `${base}koki-content/` : `${base}/koki-content/`;
  },

  getStagingDirectory(): string {
    const base = getBaseCacheDir();
    return base.endsWith("/") ? `${base}koki-downloads/` : `${base}/koki-downloads/`;
  },

  getPackDirectory(packId: string): string {
    return `${this.getContentDirectory()}${packId}/`;
  },

  getPackStagingDirectory(packId: string): string {
    return `${this.getStagingDirectory()}${packId}-temp/`;
  },

  /**
   * Ensure directory exists (creates recursively).
   */
  async ensureDirectory(dirUri: string): Promise<void> {
    if (expoFs) {
      const info = await expoFs.getInfoAsync(dirUri);
      if (!info.exists) {
        await expoFs.makeDirectoryAsync(dirUri, { intermediates: true });
      }
      return;
    }

    if (nodeFs && dirUri.startsWith("/")) {
      if (!nodeFs.existsSync(dirUri)) {
        nodeFs.mkdirSync(dirUri, { recursive: true });
      }
      return;
    }
  },

  /**
   * Write string contents to a file.
   */
  async writeFile(fileUri: string, content: string): Promise<void> {
    if (expoFs) {
      // Ensure parent directory exists
      const parentDir = fileUri.substring(0, fileUri.lastIndexOf("/") + 1);
      if (parentDir) {
        await this.ensureDirectory(parentDir);
      }
      await expoFs.writeAsStringAsync(fileUri, content, {
        encoding: expoFs.EncodingType.UTF8,
      });
      return;
    }

    if (nodeFs && fileUri.startsWith("/")) {
      const parentDir = nodePath?.dirname(fileUri);
      if (parentDir && !nodeFs.existsSync(parentDir)) {
        nodeFs.mkdirSync(parentDir, { recursive: true });
      }
      nodeFs.writeFileSync(fileUri, content, "utf8");
      return;
    }

    inMemoryStore.set(fileUri, content);
  },

  /**
   * Read file contents as a string.
   */
  async readFile(fileUri: string): Promise<string> {
    if (expoFs) {
      return await expoFs.readAsStringAsync(fileUri, {
        encoding: expoFs.EncodingType.UTF8,
      });
    }

    if (nodeFs && fileUri.startsWith("/")) {
      return nodeFs.readFileSync(fileUri, "utf8");
    }

    const val = inMemoryStore.get(fileUri);
    if (val !== undefined) return val;
    throw new Error(`File not found: ${fileUri}`);
  },

  /**
   * Check if a file or directory exists.
   */
  async fileExists(fileUri: string): Promise<boolean> {
    if (expoFs) {
      const info = await expoFs.getInfoAsync(fileUri);
      return info.exists;
    }

    if (nodeFs && fileUri.startsWith("/")) {
      return nodeFs.existsSync(fileUri);
    }

    return inMemoryStore.has(fileUri);
  },

  /**
   * Delete a directory or file safely and idempotently.
   */
  async deletePath(uri: string): Promise<void> {
    if (expoFs) {
      await expoFs.deleteAsync(uri, { idempotent: true });
      return;
    }

    if (nodeFs && uri.startsWith("/")) {
      if (nodeFs.existsSync(uri)) {
        nodeFs.rmSync(uri, { recursive: true, force: true });
      }
      return;
    }

    for (const key of Array.from(inMemoryStore.keys())) {
      if (key.startsWith(uri)) {
        inMemoryStore.delete(key);
      }
    }
  },

  /**
   * Move staging directory to final target directory atomically.
   */
  async atomicMoveDirectory(fromUri: string, toUri: string): Promise<void> {
    // Delete destination if it already exists
    await this.deletePath(toUri);

    if (expoFs) {
      await expoFs.moveAsync({ from: fromUri, to: toUri });
      return;
    }

    if (nodeFs && fromUri.startsWith("/") && toUri.startsWith("/")) {
      // Ensure destination parent exists
      const parent = nodePath?.dirname(toUri);
      if (parent && !nodeFs.existsSync(parent)) {
        nodeFs.mkdirSync(parent, { recursive: true });
      }
      nodeFs.renameSync(fromUri, toUri);
      return;
    }

    // In-memory fallback
    for (const [k, v] of Array.from(inMemoryStore.entries())) {
      if (k.startsWith(fromUri)) {
        const newKey = k.replace(fromUri, toUri);
        inMemoryStore.set(newKey, v);
        inMemoryStore.delete(k);
      }
    }
  },

  /**
   * Get estimated available free storage in bytes.
   * Returns a safe estimate (e.g. 1GB) if native query unavailable.
   */
  async getFreeDiskSpace(): Promise<number> {
    try {
      if (expoFs && "getFreeDiskStorageAsync" in expoFs) {
        const bytes = await (expoFs as any).getFreeDiskStorageAsync();
        if (typeof bytes === "number" && bytes > 0) {
          return bytes;
        }
      }
    } catch {
      // safe ignore
    }
    // Safe default: 1 GB
    return 1024 * 1024 * 1024;
  },
};
