import {
  ContentPackManifest,
  ContentPackStatus,
  ContentPackCurriculumData,
  DownloadOptions,
} from "../types";
import { ContentPackRecord } from "@/storage/database/types";
import { ContentPackRepository } from "@/storage/repositories/contentPackRepository";
import { ContentStorage } from "./contentStorage";
import { downloadManager } from "./downloadManager";
import { IPackSource, defaultMockPackSource } from "../data/mockPackSource";
import { CanonicalCurriculum } from "@/features/progression/types";
import { LessonDefinition } from "@/features/lessons/types";

interface LoadedPackData {
  manifest: ContentPackManifest;
  curriculum: ContentPackCurriculumData;
  audioMap: Map<string, string>; // audioKey -> file URI
  imageMap: Map<string, string>; // imageKey -> file URI
}

class ContentPackService {
  private packSource: IPackSource = defaultMockPackSource;
  private installedPacks: Map<string, LoadedPackData> = new Map();
  private isInitialized: boolean = false;
  private activeLessonId: string | null = null;

  public setPackSource(source: IPackSource) {
    this.packSource = source;
    downloadManager.setPackSource(source);
  }

  /**
   * Set currently playing lesson ID for active lesson safety guards.
   */
  public setActiveLesson(lessonId: string | null) {
    this.activeLessonId = lessonId;
  }

  public getActiveLessonId(): string | null {
    return this.activeLessonId;
  }

  /**
   * Check if a pack has an actively running lesson right now.
   */
  public isPackActiveInLesson(packId: string): boolean {
    if (!this.activeLessonId) return false;
    const pack = this.installedPacks.get(packId);
    if (!pack) return false;
    return Boolean(pack.curriculum.lessons[this.activeLessonId]);
  }

  /**
   * Initialize and load all installed packs from disk into in-memory resolver cache.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const records = await ContentPackRepository.getInstalledPacks();
      for (const record of records) {
        await this.loadPackIntoMemory(record.id);
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn("[ContentPackService] Error initializing installed packs:", err);
    }
  }

  /**
   * Load an installed pack's manifest, curriculum, and asset maps into memory.
   */
  private async loadPackIntoMemory(packId: string): Promise<boolean> {
    try {
      const packDir = ContentStorage.getPackDirectory(packId);
      const manifestPath = `${packDir}manifest.json`;

      if (!(await ContentStorage.fileExists(manifestPath))) {
        return false;
      }

      const manifestStr = await ContentStorage.readFile(manifestPath);
      const manifest: ContentPackManifest = JSON.parse(manifestStr);

      const curriculumPath = `${packDir}${manifest.curriculumFile.path}`;
      if (!(await ContentStorage.fileExists(curriculumPath))) {
        return false;
      }

      const curriculumStr = await ContentStorage.readFile(curriculumPath);
      const curriculum: ContentPackCurriculumData = JSON.parse(curriculumStr);

      const audioMap = new Map<string, string>();
      const imageMap = new Map<string, string>();

      for (const asset of manifest.assets) {
        const fullAssetPath = `${packDir}${asset.path}`;
        if (asset.type === "audio") {
          audioMap.set(asset.key, fullAssetPath);
        } else if (asset.type === "image") {
          imageMap.set(asset.key, fullAssetPath);
        }
      }

      this.installedPacks.set(packId, {
        manifest,
        curriculum,
        audioMap,
        imageMap,
      });

      return true;
    } catch (err) {
      console.warn(`[ContentPackService] Failed to load pack ${packId} into memory:`, err);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Resolver Integration Queries (Synchronous for smooth UI rendering)
  // ---------------------------------------------------------------------------

  /**
   * Retrieve curriculum definition for an installed downloaded world.
   */
  public getInstalledWorld(worldId: string): CanonicalCurriculum | null {
    for (const pack of this.installedPacks.values()) {
      if (pack.curriculum.world && pack.curriculum.world.worldId === worldId) {
        return pack.curriculum.world;
      }
    }
    return null;
  }

  /**
   * Get all canonical curriculum worlds from installed packs.
   */
  public getAllInstalledWorlds(): CanonicalCurriculum[] {
    const worlds: CanonicalCurriculum[] = [];
    for (const pack of this.installedPacks.values()) {
      if (pack.curriculum.world) {
        worlds.push(pack.curriculum.world);
      }
    }
    return worlds;
  }

  /**
   * Retrieve a lesson definition by ID from installed packs.
   */
  public getLessonDefinition(lessonId: string): LessonDefinition | null {
    for (const pack of this.installedPacks.values()) {
      if (pack.curriculum.lessons && pack.curriculum.lessons[lessonId]) {
        return pack.curriculum.lessons[lessonId];
      }
    }
    return null;
  }

  /**
   * Resolve an audio key to its local file URI if it belongs to an installed pack.
   */
  public resolveAudioPath(key: string): string | null {
    for (const pack of this.installedPacks.values()) {
      const path = pack.audioMap.get(key);
      if (path) return path;
    }
    return null;
  }

  /**
   * Resolve an image key to its local file URI if it belongs to an installed pack.
   */
  public resolveImagePath(key: string): string | null {
    for (const pack of this.installedPacks.values()) {
      const path = pack.imageMap.get(key);
      if (path) return path;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Pack Lifecycle & Management
  // ---------------------------------------------------------------------------

  /**
   * List all available packs merging remote manifests with local SQLite records.
   */
  public async listAvailablePacks(): Promise<{
    manifest: ContentPackManifest;
    record: ContentPackRecord | null;
    status: ContentPackStatus;
  }[]> {
    await this.init();

    let availableRemote: ContentPackManifest[] = [];
    try {
      availableRemote = await this.packSource.listAvailablePacks();
    } catch {
      // Offline fallback: Use cached records from SQLite
    }

    const localRecords = await ContentPackRepository.getAllPacks();
    const recordsMap = new Map<string, ContentPackRecord>();
    for (const r of localRecords) {
      recordsMap.set(r.id, r);
    }

    const results: {
      manifest: ContentPackManifest;
      record: ContentPackRecord | null;
      status: ContentPackStatus;
    }[] = [];

    const processedIds = new Set<string>();

    for (const manifest of availableRemote) {
      processedIds.add(manifest.id);
      const record = recordsMap.get(manifest.id) || null;

      let status: ContentPackStatus = "not_downloaded";
      if (record) {
        if (record.status === "installed") {
          // Check for version update
          if (manifest.version > record.version) {
            status = "update_available";
          } else {
            status = "installed";
          }
        } else {
          status = record.status;
        }
      }

      results.push({
        manifest,
        record,
        status,
      });
    }

    // Include any local records that were not returned by remote (e.g. offline)
    for (const record of localRecords) {
      if (!processedIds.has(record.id)) {
        try {
          const manifest: ContentPackManifest = JSON.parse(record.manifestJson);
          results.push({
            manifest,
            record,
            status: record.status,
          });
        } catch {
          // safe ignore corrupted JSON
        }
      }
    }

    return results;
  }

  /**
   * Download and install a content pack.
   */
  public async downloadPack(
    packId: string,
    options?: DownloadOptions
  ): Promise<void> {
    const manifest = await this.packSource.getPackManifest(packId);
    if (!manifest) {
      throw new Error(`Pack not found: ${packId}`);
    }

    // Save initial record in SQLite
    const existing = await ContentPackRepository.getPack(packId);
    if (!existing) {
      await ContentPackRepository.upsertPack({
        id: manifest.id,
        version: manifest.version,
        contentVersion: manifest.contentVersion,
        status: "downloading",
        installedPath: null,
        downloadedBytes: 0,
        totalBytes: manifest.estimatedSizeBytes,
        checksum: manifest.checksum,
        manifestJson: JSON.stringify(manifest),
        installedAt: null,
        updatedAt: Date.now(),
        lastError: null,
      });
    }

    await downloadManager.downloadAndInstallPack(manifest, options);
    await this.loadPackIntoMemory(packId);
  }

  /**
   * Update an installed pack to a newer version.
   * Preserves existing installed version if update fails.
   */
  public async updatePack(
    packId: string,
    options?: DownloadOptions
  ): Promise<void> {
    if (this.isPackActiveInLesson(packId)) {
      throw new Error("Cannot update adventure while a lesson is running.");
    }

    const manifest = await this.packSource.getPackManifest(packId);
    if (!manifest) throw new Error("Pack update not found");

    // Download to staging and verify atomically; old pack remains untouched if download fails
    await downloadManager.downloadAndInstallPack(manifest, options);
    await this.loadPackIntoMemory(packId);
  }

  /**
   * Delete downloaded files for a pack to free storage.
   * Guaranteed: NEVER deletes child lesson progress, stars, or achievements!
   */
  public async deletePack(packId: string): Promise<void> {
    if (this.isPackActiveInLesson(packId)) {
      throw new Error("Cannot remove adventure while a lesson is running.");
    }

    // Remove from in-memory cache
    this.installedPacks.delete(packId);

    // Delete files from filesystem
    const packDir = ContentStorage.getPackDirectory(packId);
    await ContentStorage.deletePath(packDir);

    // Update SQLite record status to not_downloaded
    await ContentPackRepository.markDeleted(packId);
  }

  // ---------------------------------------------------------------------------
  // Developer Diagnostics & Testing Utilities
  // ---------------------------------------------------------------------------

  public inspectInstalledPacks(): {
    id: string;
    version: number;
    worldId?: string;
    lessonCount: number;
    audioCount: number;
    imageCount: number;
  }[] {
    const summary = [];
    for (const [id, data] of this.installedPacks.entries()) {
      summary.push({
        id,
        version: data.manifest.version,
        worldId: data.manifest.worldId,
        lessonCount: Object.keys(data.curriculum.lessons || {}).length,
        audioCount: data.audioMap.size,
        imageCount: data.imageMap.size,
      });
    }
    return summary;
  }

  public simulatePackUpdate(packId: string): void {
    if (this.packSource instanceof defaultMockPackSource.constructor) {
      (this.packSource as any).setVersion(2);
    }
  }

  public async deleteAllDownloadedPacksForDev(): Promise<void> {
    for (const packId of Array.from(this.installedPacks.keys())) {
      await this.deletePack(packId);
    }
  }
}

export const contentPackService = new ContentPackService();
export { ContentPackService };
